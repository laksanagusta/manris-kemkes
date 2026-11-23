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
	Year                       int        `json:"year"`
	Semester                   int        `json:"semester"`
	ProfileID                  *uuid.UUID `json:"profileId"`
	Reason                     string     `json:"reason"`
	ApplyHistoricalCorrections bool       `json:"applyHistoricalCorrections,omitempty"`
	selection                  *UPRReportDraftInput
}

type UPRSemesterSnapshot struct {
	ReviewKey   string                  `json:"reviewKey,omitempty"`
	Title       string                  `json:"title,omitempty"`
	Cutoff      string                  `json:"cutoff"`
	Profile     *AnnualProfileVersion   `json:"profile"`
	Reason      string                  `json:"reason"`
	Risks       json.RawMessage         `json:"risks"`
	Supporting  []UPRSupportingSection  `json:"supporting"`
	Periods     []UPRReportPeriodSource `json:"periods,omitempty"`
	Corrections []UPRReportCorrection   `json:"corrections,omitempty"`
}

type UPRReportPeriodSource struct {
	ID             uuid.UUID `json:"id"`
	Period         string    `json:"period"`
	Label          string    `json:"label"`
	ProfileID      uuid.UUID `json:"profileId"`
	ProfileVersion int       `json:"profileVersion"`
	NeedsReview    bool      `json:"needsReview,omitempty"`
}

type UPRReportCorrection struct {
	GroupID        uuid.UUID `json:"groupId"`
	RiskID         uuid.UUID `json:"riskId"`
	RiskCode       string    `json:"riskCode"`
	Period         string    `json:"period"`
	ProfileID      uuid.UUID `json:"profileId"`
	ProfileVersion int       `json:"profileVersion"`
	EffectiveFrom  string    `json:"effectiveFrom"`
	Reason         string    `json:"reason"`
}

type UPRSupportingSection struct {
	Kind           string          `json:"kind"`
	Period         string          `json:"period"`
	SourceID       *uuid.UUID      `json:"sourceId"`
	Code           *string         `json:"code"`
	FinalizedAt    *time.Time      `json:"finalizedAt"`
	Contents       json.RawMessage `json:"contents,omitempty" db:"-"`
	ProfileID      *uuid.UUID      `json:"profileId,omitempty"`
	ProfileVersion *int            `json:"profileVersion,omitempty"`
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
	out := UPRSemesterSnapshot{
		Cutoff: cutoff.AddDate(0, 0, -1).Format(time.DateOnly), Risks: json.RawMessage("[]"),
		Reason: strings.TrimSpace(input.Reason), Supporting: []UPRSupportingSection{},
	}
	if len([]rune(out.Reason)) > 2000 {
		return out, UPRWorkflowError("Alasan koreksi maksimal 2.000 karakter.")
	}
	if input.ApplyHistoricalCorrections && (input.ProfileID == nil || out.Reason == "") {
		return out, UPRWorkflowError("Pilih versi profil final dan isi alasan untuk menerapkan koreksi historis.")
	}
	var selected AnnualProfileVersion
	query := `SELECT ` + annualVersionColumns + ` FROM annual_risk_profile_versions WHERE organization_id=$1 AND year=$2 AND finalized_at IS NOT NULL`
	if input.ProfileID != nil {
		err = tx.QueryRow(ctx, query+` AND id=$3`, org, input.Year, input.ProfileID).Scan(&selected.MonitoringRuleID, &selected.ID, &selected.Version, &selected.FinalizedAt, &selected.FinalizedBy)
		if errors.Is(err, pgx.ErrNoRows) {
			return out, UPRWorkflowError("Pilih versi profil final untuk UPR dan tahun ini.")
		}
	} else {
		err = tx.QueryRow(ctx, query+` AND finalized_at<$3 ORDER BY version DESC LIMIT 1`, org, input.Year, cutoff).Scan(&selected.MonitoringRuleID, &selected.ID, &selected.Version, &selected.FinalizedAt, &selected.FinalizedBy)
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return out, err
	}
	if err == nil {
		out.Profile = &selected
		if err = tx.QueryRow(ctx, semesterRiskSnapshotSQL, org, input.Year, selected.Version, out.Cutoff, quarters, input.ApplyHistoricalCorrections).Scan(&out.Risks, &out.Corrections); err != nil {
			return out, err
		}
		if input.ApplyHistoricalCorrections && len(out.Corrections) == 0 {
			return out, UPRWorkflowError("Versi profil ini belum memiliki koreksi historis yang berlaku untuk periode laporan.")
		}
		if selected.MonitoringRuleID != nil {
			rows, err := tx.Query(ctx, `WITH selected AS (SELECT id,monitoring_rule_id FROM annual_risk_profile_versions WHERE organization_id=$1 AND year=$2 AND version=$3), `+semesterConfiguredPeriodsSQL+`
				SELECT p.id,p.period,p.label,anchor.id,anchor.version,p.needs_review FROM configured_periods p
				JOIN annual_risk_profile_versions anchor ON anchor.id=p.anchor_id ORDER BY p.ordinal`, org, input.Year, selected.Version, out.Cutoff, quarters)
			if err != nil {
				return out, err
			}
			out.Periods, err = pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportPeriodSource])
			if err != nil {
				return out, err
			}
		}
	}
	if input.selection != nil {
		out.Title = input.selection.Title
		out.Supporting, err = selectedReportSources(ctx, tx, org, *input.selection)
		if err != nil {
			return out, err
		}
	} else if selected.MonitoringRuleID != nil {
		scope := input
		scope.ProfileID = &selected.ID
		options, err := reportDocumentOptions(ctx, tx, org, "", scope, nil, "", 0, 0)
		if err != nil {
			return out, err
		}
		for _, option := range options {
			if option.Kind != "profile" {
				out.Supporting = append(out.Supporting, option.supportingSection())
			}
		}
	} else {
		rows, err := tx.Query(ctx, `SELECT 'working_paper',q.period,p.id,p.code,p.completed_at,p.profile_version_id,p.version
			FROM unnest($2::text[]) WITH ORDINALITY q(period,position)
			LEFT JOIN LATERAL (
				SELECT w.id,w.code,w.completed_at,w.profile_version_id,pv.version FROM working_papers w
				LEFT JOIN annual_risk_profile_versions pv ON pv.id=w.profile_version_id
				WHERE w.org_id=$1 AND w.assessment_cycle=q.period AND w.status='completed' AND w.monitoring_period_id IS NULL
				  AND (w.profile_version_id IS NULL OR (pv.organization_id=$1 AND pv.year=$4 AND pv.version<=$5))
				ORDER BY w.completed_at DESC NULLS LAST,w.id DESC LIMIT 1) p ON TRUE
			UNION ALL
			SELECT 'evaluation',$3,e.id,e.code,e.finalized_at,e.profile_version_id,e.version FROM (SELECT 1) seed
			LEFT JOIN LATERAL (
				SELECT e.id,e.code,e.finalized_at,e.profile_version_id,pv.version FROM evaluations e
				LEFT JOIN annual_risk_profile_versions pv ON pv.id=e.profile_version_id
				WHERE e.organization_id=$1 AND e.status='final' AND e.period IN ($3,($2::text[])[2]) AND e.monitoring_period_id IS NULL
				  AND (e.profile_version_id IS NULL OR (pv.organization_id=$1 AND pv.year=$4 AND pv.version<=$5))
				ORDER BY e.finalized_at DESC NULLS LAST,e.id DESC LIMIT 1) e ON TRUE`, org, quarters, period, input.Year, selected.Version)
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

const semesterConfiguredPeriodsSQL = `configured_periods AS (
	SELECT p.id,p.label,p.ordinal,format('%s-%s%s',r.year,
		CASE r.frequency WHEN 'monthly' THEN 'M' WHEN 'quarterly' THEN 'Q' ELSE 'H' END,p.ordinal) AS period,
		annual_monitoring_period_profile(s.id,p.id) AS anchor_id, COALESCE(frozen.needs_review,false) AS needs_review,
		bounds.ends_on AS period_end,
		frozen.profile_version_id IS NOT NULL AS frozen
	FROM selected s JOIN monitoring_rules r ON r.id=s.monitoring_rule_id
	JOIN monitoring_rule_periods p ON p.rule_id=r.id
	CROSS JOIN LATERAL annual_monitoring_period_bounds(p.id) bounds
	LEFT JOIN LATERAL annual_monitoring_period_freeze(s.id,p.id) frozen ON TRUE
	WHERE bounds.starts_on >= make_date(r.year,(RIGHT(($5::text[])[1],1)::int-1)*3+1,1)
	  AND bounds.ends_on <= $4::date
)`

// Pick the latest period baseline for each risk and retain the exact sources
// behind each observation, including observations from a predecessor profile.
const semesterRiskSnapshotSQL = `WITH selected AS (
	SELECT id,monitoring_rule_id FROM annual_risk_profile_versions
	WHERE organization_id=$1 AND year=$2 AND version=$3 AND finalized_at IS NOT NULL
), ` + semesterConfiguredPeriodsSQL + `, configured_members AS (
	SELECT p.id AS period_id,p.period,p.ordinal,p.anchor_id,s.*
	FROM selected v CROSS JOIN configured_periods p
	CROSS JOIN LATERAL annual_monitoring_period_scope(v.id,p.id) s
), corrections AS (
	SELECT DISTINCT ON (p.id,m.version_group_id)
		p.id AS period_id,p.period,p.ordinal,m.version_group_id,m.risk_id,m.profile_version_id,m.baseline,
		m.effective_from,m.change_reason,m.objective_id,c.version
	FROM configured_periods p
	JOIN annual_risk_profile_versions anchor ON anchor.id=p.anchor_id
	JOIN annual_risk_profile_versions c ON c.organization_id=$1 AND c.year=$2 AND c.version>anchor.version AND c.version<=$3
	  AND c.finalized_at IS NOT NULL
	JOIN annual_risk_profile_members m ON m.profile_version_id=c.id
	WHERE $6::boolean AND p.frozen AND m.historical_correction AND m.effective_from<=p.period_end
	  AND NOT EXISTS (
		SELECT 1 FROM annual_risk_profile_members previous
		WHERE previous.profile_version_id=c.previous_version_id AND previous.version_group_id=m.version_group_id
		  AND previous.historical_correction AND previous.risk_id IS NOT DISTINCT FROM m.risk_id
		  AND previous.objective_id IS NOT DISTINCT FROM m.objective_id AND previous.effective_from=m.effective_from
		  AND previous.change_reason=m.change_reason AND previous.baseline IS NOT DISTINCT FROM m.baseline
	  )
	ORDER BY p.id,m.version_group_id,c.version DESC
), report_members AS (
	SELECT cm.version_group_id,cm.risk_id,cm.baseline,cm.effective_from,cm.change_reason,cm.objective_id,cm.profile_version_id,cm.ordinal
	FROM configured_members cm
	WHERE NOT EXISTS (SELECT 1 FROM corrections c WHERE c.period_id=cm.period_id AND c.version_group_id=cm.version_group_id)
	UNION ALL
	SELECT c.version_group_id,c.risk_id,c.baseline,c.effective_from,c.change_reason,c.objective_id,c.profile_version_id,c.ordinal
	FROM corrections c
), members AS (
	SELECT DISTINCT ON (version_group_id) version_group_id,risk_id,baseline,effective_from,change_reason,
		objective_id,profile_version_id AS profile_id,MIN(effective_from) OVER(PARTITION BY version_group_id) AS first_effective
	FROM report_members ORDER BY version_group_id,ordinal DESC
), legacy_members AS (
	SELECT DISTINCT ON(m.version_group_id) m.version_group_id,m.risk_id,m.baseline,m.effective_from,m.change_reason,
		m.objective_id,m.profile_version_id AS profile_id,MIN(m.effective_from) OVER(PARTITION BY m.version_group_id) AS first_effective
	FROM selected s
	CROSS JOIN LATERAL (
		SELECT $4::date AS cutoff
		UNION
		SELECT x.effective_from-1 FROM annual_risk_profile_exclusions x
		JOIN annual_risk_profile_versions p ON p.id=x.profile_version_id
		WHERE p.organization_id=$1 AND p.year=$2 AND p.version<=$3 AND p.finalized_at IS NOT NULL
		  AND x.effective_from<= $4::date
		  AND x.effective_from> make_date($2,(RIGHT(($5::text[])[1],1)::int-1)*3+1,1)
	) dates
	CROSS JOIN LATERAL annual_monitoring_members_as_of(s.id,dates.cutoff) m
	WHERE s.monitoring_rule_id IS NULL
	ORDER BY m.version_group_id,dates.cutoff DESC
), report_range AS (
    SELECT make_date(LEFT(($5::text[])[1],4)::int,(RIGHT(($5::text[])[1],1)::int-1)*3+1,1) AS start_date,
           $4::date AS end_date
), observations AS (
	SELECT rm.*,COALESCE(cm.period,rm.assessment_cycle) AS report_period,source_profile.version AS profile_version
	FROM risk_monitorings rm
	JOIN risks source ON source.id=rm.source_risk_id
	LEFT JOIN configured_members cm ON cm.period_id=rm.monitoring_period_id AND cm.version_group_id=rm.version_group_id
	LEFT JOIN annual_risk_profile_versions anchor ON anchor.id=cm.anchor_id
	LEFT JOIN annual_risk_profile_versions source_profile ON source_profile.id=rm.profile_version_id
	CROSS JOIN selected s
	WHERE source.organization_id=$1 AND rm.status='final' AND rm.transaction_kind='monitoring' AND rm.superseded_by_monitoring_id IS NULL
	  AND (s.monitoring_rule_id IS NULL AND rm.monitoring_period_id IS NULL
	       AND (rm.profile_version_id IS NULL OR (source_profile.organization_id=$1 AND source_profile.year=$2 AND source_profile.version<=$3 AND source_profile.finalized_at IS NOT NULL))
	       AND EXISTS (SELECT 1 FROM annual_monitoring_members_as_of(s.id,rm.observed_at) m WHERE m.version_group_id=rm.version_group_id)
	       OR s.monitoring_rule_id IS NOT NULL AND source_profile.organization_id=$1 AND source_profile.year=$2
	       AND source_profile.monitoring_rule_id=s.monitoring_rule_id AND source_profile.finalized_at IS NOT NULL AND source_profile.version<=anchor.version)
), report_rows AS (
	SELECT COALESCE(m.baseline,'{}'::jsonb) || jsonb_build_object(
		'groupId',m.version_group_id,'profileId',m.profile_id,'objectiveId',m.objective_id,
		'effectiveFrom',m.effective_from,'changeReason',m.change_reason,
		'monitoring',COALESCE(obs.data,'[]'::jsonb),
        'latestMonitoring',obs.data->-1,
        'mitigationReports',COALESCE(mitigation_reports.data,'[]'::jsonb),
        'events',COALESCE(events.data,'[]'::jsonb)
	) AS item
	FROM (SELECT * FROM members UNION ALL SELECT * FROM legacy_members) m CROSS JOIN report_range period
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
          AND (
            EXISTS (SELECT 1 FROM selected s WHERE s.monitoring_rule_id IS NULL)
            OR EXISTS (SELECT 1 FROM observations o WHERE o.id=t.monitoring_id)
            OR (t.monitoring_id IS NULL AND EXISTS (SELECT 1 FROM configured_members cm WHERE cm.risk_id=r.id))
          )
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
			'id',a.id,'period',a.report_period,'score',round(a.observed_nilai)::int,
			'value',a.observed_nilai,'level',a.observed_level,'conclusion',a.conclusion,
			'mitigationProgress',a.mitigation_progress_summary,'mitigationCompletion',a.mitigation_completion_percent,
			'sourceRiskId',a.source_risk_id,'profileId',a.profile_version_id,'profileVersion',a.profile_version,
			'monitoringPeriodId',a.monitoring_period_id,'observedAt',a.observed_at,'observedAtInferred',a.observed_at_inferred,'finalizedAt',a.finalized_at
		) ORDER BY a.observed_at,a.finalized_at NULLS FIRST,a.id) AS data
		FROM observations a WHERE a.version_group_id=m.version_group_id
		  AND a.observed_at BETWEEN period.start_date AND period.end_date
		  AND (a.monitoring_period_id IS NOT NULL OR a.observed_at>=m.first_effective)
	) obs ON TRUE
) SELECT
	(SELECT COALESCE(jsonb_agg(item ORDER BY item->>'code',item->>'groupId'),'[]'::jsonb) FROM report_rows),
	(SELECT COALESCE(jsonb_agg(jsonb_build_object(
		'groupId',c.version_group_id,'riskId',c.risk_id,'riskCode',COALESCE(c.baseline->>'code',''),'period',c.period,
		'profileId',c.profile_version_id,'profileVersion',c.version,'effectiveFrom',c.effective_from,'reason',c.change_reason
	) ORDER BY c.ordinal,c.baseline->>'code',c.version_group_id),'[]'::jsonb) FROM corrections c)`

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
	for _, period := range snapshot.Periods {
		if period.NeedsReview && snapshot.Reason == "" {
			return UPRWorkflowError("Isi alasan penggunaan sumber historis untuk periode bertanda Perlu ditinjau.")
		}
	}
	return nil
}
