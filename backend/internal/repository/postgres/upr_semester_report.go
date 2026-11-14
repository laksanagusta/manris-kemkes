package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/timeutil"
)

type UPRSemesterInput struct {
	Year      int        `json:"year"`
	Semester  int        `json:"semester"`
	ProfileID *uuid.UUID `json:"profileId"`
	Reason    string     `json:"reason"`
	selection *UPRReportDraftInput
}

type UPRSemesterSnapshot struct {
	ReviewKey  string                 `json:"reviewKey,omitempty"`
	Title      string                 `json:"title,omitempty"`
	Cutoff     string                 `json:"cutoff"`
	Profile    *AnnualProfileVersion  `json:"profile"`
	Reason     string                 `json:"reason"`
	Risks      json.RawMessage        `json:"risks"`
	Supporting []UPRSupportingSection `json:"supporting"`
}

type UPRSupportingSection struct {
	Kind        string          `json:"kind"`
	Period      string          `json:"period"`
	SourceID    *uuid.UUID      `json:"sourceId"`
	Code        *string         `json:"code"`
	FinalizedAt *time.Time      `json:"finalizedAt"`
	Contents    json.RawMessage `json:"contents,omitempty" db:"-"`
}

func semesterPeriod(input UPRSemesterInput) (string, time.Time, []string, error) {
	if input.Year < 1900 || input.Year > 9998 || (input.Semester != 1 && input.Semester != 2) {
		return "", time.Time{}, nil, UPRWorkflowError("Pilih tahun dan semester yang valid.")
	}
	period := fmt.Sprintf("%d-H%d", input.Year, input.Semester)
	cutoff := time.Date(input.Year, time.Month(1+6*input.Semester), 1, 0, 0, 0, 0, timeutil.JakartaLocation())
	quarters := []string{fmt.Sprintf("%d-Q%d", input.Year, input.Semester*2-1), fmt.Sprintf("%d-Q%d", input.Year, input.Semester*2)}
	return period, cutoff, quarters, nil
}

func (s *UPRWorkflow) PreviewSemester(ctx context.Context, org uuid.UUID, input UPRSemesterInput) (UPRSemesterSnapshot, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return UPRSemesterSnapshot{}, err
	}
	defer tx.Rollback(ctx)
	result, err := buildSemester(ctx, tx, org, input)
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

func buildSemester(ctx context.Context, tx pgx.Tx, org uuid.UUID, input UPRSemesterInput) (UPRSemesterSnapshot, error) {
	period, cutoff, quarters, err := semesterPeriod(input)
	if err != nil {
		return UPRSemesterSnapshot{}, err
	}
	out := UPRSemesterSnapshot{Cutoff: cutoff.AddDate(0, 0, -1).Format(time.DateOnly), Risks: json.RawMessage("[]"), Reason: strings.TrimSpace(input.Reason)}
	if len([]rune(out.Reason)) > 2000 {
		return out, UPRWorkflowError("Alasan koreksi maksimal 2.000 karakter.")
	}
	var selected AnnualProfileVersion
	query := `SELECT ` + annualVersionColumns + ` FROM annual_risk_profile_versions WHERE organization_id=$1 AND year=$2 AND finalized_at IS NOT NULL`
	if input.ProfileID != nil {
		err = tx.QueryRow(ctx, query+` AND id=$3`, org, input.Year, input.ProfileID).Scan(&selected.ID, &selected.Version, &selected.FinalizedAt, &selected.FinalizedBy)
		if errors.Is(err, pgx.ErrNoRows) {
			return out, UPRWorkflowError("Pilih versi profil final untuk UPR dan tahun ini.")
		}
	} else {
		err = tx.QueryRow(ctx, query+` AND finalized_at<$3 ORDER BY version DESC LIMIT 1`, org, input.Year, cutoff).Scan(&selected.ID, &selected.Version, &selected.FinalizedAt, &selected.FinalizedBy)
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return out, err
	}
	if err == nil {
		out.Profile = &selected
		if err = tx.QueryRow(ctx, semesterRiskSnapshotSQL, org, input.Year, selected.Version, out.Cutoff, quarters).Scan(&out.Risks); err != nil {
			return out, err
		}
	}
	if input.selection != nil {
		out.Title = input.selection.Title
		out.Supporting, err = selectedReportSources(ctx, tx, org, *input.selection)
		if err != nil {
			return out, err
		}
	} else {
		rows, err := tx.Query(ctx, `SELECT 'working_paper',q.period,p.id,p.code,p.completed_at
			FROM unnest($2::text[]) WITH ORDINALITY q(period,position)
			LEFT JOIN LATERAL (SELECT id,code,completed_at FROM working_papers WHERE org_id=$1
				AND assessment_cycle=q.period AND status='completed' ORDER BY completed_at DESC NULLS LAST,id DESC LIMIT 1) p ON TRUE
			UNION ALL
			SELECT 'evaluation',$3,e.id,e.code,e.finalized_at FROM (SELECT 1) seed
			LEFT JOIN LATERAL (SELECT id,code,finalized_at FROM evaluations WHERE organization_id=$1 AND status='final'
				AND period IN ($3,($2::text[])[2]) ORDER BY finalized_at DESC NULLS LAST,id DESC LIMIT 1) e ON TRUE`, org, quarters, period)
		if err != nil {
			return out, err
		}
		out.Supporting, err = pgx.CollectRows(rows, pgx.RowToStructByPos[UPRSupportingSection])
		if err != nil {
			return out, err
		}
	}
	for i := range out.Supporting {
		section := &out.Supporting[i]
		if section.SourceID == nil {
			continue
		}
		var document any
		if section.Kind == "working_paper" {
			document, err = (&workingPaperRepository{pool: tx}).GetByID(ctx, *section.SourceID)
		} else {
			document, err = (&evaluationRepository{pool: tx}).GetByID(ctx, *section.SourceID)
		}
		if err != nil {
			return out, err
		}
		section.Contents, err = json.Marshal(document)
		if err != nil {
			return out, err
		}
	}
	return out, err
}

// A later profile may contain changes effective on both sides of the cutoff.
// Rank eligible members across its predecessors to retain the older baseline
// for a risk whose latest change takes effect after this semester.
const semesterRiskSnapshotSQL = `WITH members AS (
	SELECT DISTINCT ON(m.version_group_id) m.version_group_id,m.risk_id,m.baseline,m.effective_from,m.change_reason,
		m.objective_id,p.id AS profile_id,MIN(m.effective_from) OVER(PARTITION BY m.version_group_id) AS first_effective
	FROM annual_risk_profile_members m JOIN annual_risk_profile_versions p ON p.id=m.profile_version_id
	WHERE p.organization_id=$1 AND p.year=$2 AND p.version<=$3 AND p.finalized_at IS NOT NULL
	AND m.effective_from<=$4::date
	ORDER BY m.version_group_id,p.version DESC
), report_range AS (
    SELECT make_date(LEFT(($5::text[])[1],4)::int,(RIGHT(($5::text[])[1],1)::int-1)*3+1,1) AS start_date,
           $4::date AS end_date
), report_rows AS (
	SELECT m.baseline || jsonb_build_object(
		'groupId',m.version_group_id,'profileId',m.profile_id,'objectiveId',m.objective_id,
		'effectiveFrom',m.effective_from,'changeReason',m.change_reason,
		'monitoring',COALESCE(obs.data,'[]'::jsonb),
        'latestMonitoring',obs.data->-1,
        'mitigationReports',COALESCE(mitigation_reports.data,'[]'::jsonb),
        'events',COALESCE(events.data,'[]'::jsonb)
	) AS item
	FROM members m CROSS JOIN report_range period
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
            'id',t.id,'action',plan.action,'notes',t.notes,
            'reportedOn',(t.reported_at AT TIME ZONE 'Asia/Jakarta')::date
        ) ORDER BY t.reported_at,t.id) AS data
        FROM mitigation_tasks t
        JOIN mitigations plan ON plan.id=t.mitigation_id
        JOIN risks r ON r.id=t.risk_id
        WHERE r.organization_id=$1 AND r.version_group_id=m.version_group_id
          AND t.status='done' AND NULLIF(BTRIM(t.notes),'') IS NOT NULL
          AND (t.reported_at AT TIME ZONE 'Asia/Jakarta')::date
              BETWEEN GREATEST(period.start_date,m.first_effective) AND period.end_date
    ) mitigation_reports ON TRUE
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
            'id',i.id,'code',i.code,'description',i.what,
            'occurredOn',(i."when" AT TIME ZONE 'Asia/Jakarta')::date
        ) ORDER BY i."when",i.id) AS data
        FROM incidents i
        WHERE i.organization_id=$1 AND i.status='recorded'
          AND (i."when" AT TIME ZONE 'Asia/Jakarta')::date
              BETWEEN GREATEST(period.start_date,m.first_effective) AND period.end_date
          AND EXISTS (
              SELECT 1 FROM risks r
              WHERE r.organization_id=$1 AND r.version_group_id=m.version_group_id
                AND (r.id=i.linked_risk_id OR EXISTS (
                    SELECT 1 FROM incident_risk_links l
                    WHERE l.incident_id=i.id AND l.risk_id=r.id
                ))
          )
    ) events ON TRUE
	LEFT JOIN LATERAL (
		SELECT jsonb_agg(jsonb_build_object(
			'id',a.id,'period',a.assessment_cycle,'score',round(a.observed_nilai)::int,
			'value',a.observed_nilai,'level',a.observed_level,'conclusion',a.conclusion,
			'mitigationProgress',a.mitigation_progress_summary,'mitigationCompletion',a.mitigation_completion_percent,
			'sourceRiskId',a.source_risk_id,'observedAt',a.observed_at,'observedAtInferred',a.observed_at_inferred,'finalizedAt',a.finalized_at
		) ORDER BY a.observed_at,a.finalized_at NULLS FIRST,a.id) AS data
		FROM (
			SELECT rm.*
			FROM risk_monitorings rm JOIN risks source ON source.id=rm.source_risk_id
			WHERE source.organization_id=$1 AND source.version_group_id=m.version_group_id
			AND rm.status='final' AND rm.superseded_by_monitoring_id IS NULL
            AND rm.observed_at >= GREATEST(m.first_effective,period.start_date)
            AND rm.observed_at <= period.end_date
		) a
	) obs ON TRUE
) SELECT COALESCE(jsonb_agg(item ORDER BY item->>'code',item->>'groupId'),'[]'::jsonb) FROM report_rows`

func (s *UPRWorkflow) FinalizeSemester(ctx context.Context, org, actor uuid.UUID, input UPRSemesterInput) (uuid.UUID, error) {
	period, cutoff, _, err := semesterPeriod(input)
	if err != nil {
		return uuid.Nil, err
	}
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)
	if err = lockUPROrganization(ctx, tx, org); err != nil {
		return uuid.Nil, err
	}
	snapshot, err := buildSemester(ctx, tx, org, input)
	if err != nil {
		return uuid.Nil, err
	}
	if err = validateSemesterSnapshot(snapshot, cutoff); err != nil {
		return uuid.Nil, err
	}
	return insertUPRReportVersion(ctx, tx, org, actor, "semester", period, nil, &snapshot.Profile.ID, snapshot)
}

func validateSemesterSnapshot(snapshot UPRSemesterSnapshot, cutoff time.Time) error {
	if snapshot.Profile == nil {
		return UPRWorkflowError("Finalkan Profil Risiko Tahunan dan pilih versi yang merekam kondisi per tanggal batas laporan.")
	}
	if !snapshot.Profile.FinalizedAt.Before(cutoff) && snapshot.Reason == "" {
		return UPRWorkflowError("Isi alasan penggunaan versi profil yang difinalisasi setelah tanggal batas.")
	}
	return nil
}
