package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/manris/backend/internal/timeutil"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type rosterPeriod struct {
	PeriodID        *uuid.UUID
	MonitoringCycle string
	ProfileID       *uuid.UUID
	Cutoff          string
	Label           string
}

func resolveRosterPeriod(cycle string) (rosterPeriod, error) {
	if _, _, err := parseQuarter(cycle); err != nil {
		return rosterPeriod{}, err
	}
	return rosterPeriod{MonitoringCycle: cycle}, nil
}

func resolveProfileRoster(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, orgID, profileID uuid.UUID, cutoff string) (rosterPeriod, error) {
	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())
	var year, version int
	err := q.QueryRow(ctx, `SELECT year, version FROM annual_risk_profile_versions
 WHERE id=$1 AND organization_id=$2 AND finalized_at IS NOT NULL`, profileID, orgID).Scan(&year, &version)
	if err == pgx.ErrNoRows {
		return rosterPeriod{}, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Pilih profil final milik unit kerja ini."}
	}
	if err != nil {
		return rosterPeriod{}, fmt.Errorf("read KK annual profile: %w", err)
	}
	if cutoff == "" {
		cutoff = min(now.Format(time.DateOnly), fmt.Sprintf("%04d-12-31", year))
	}
	date, err := time.Parse(time.DateOnly, cutoff)
	if err != nil || cutoff > now.Format(time.DateOnly) {
		return rosterPeriod{}, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Tanggal batas KK harus valid dan tidak melebihi hari ini."}
	}
	if date.Year() != year {
		return rosterPeriod{}, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Tanggal batas KK harus berada pada tahun profil yang dipilih."}
	}
	return rosterPeriod{MonitoringCycle: fmt.Sprintf("%04d-Q%d", year, (int(date.Month())-1)/3+1),
		ProfileID: &profileID, Cutoff: cutoff, Label: fmt.Sprintf("Profil %d · Versi %d", year, version)}, nil
}

func (r *workingPaperRepository) PreviewProfileRoster(ctx context.Context, orgID, profileID uuid.UUID, cutoff string) (*entity.WorkingPaperRosterPreview, error) {
	period, err := resolveProfileRoster(ctx, r.pool, orgID, profileID, cutoff)
	if err != nil {
		return nil, err
	}
	entries, summary, err := scanRosterPreview(ctx, r.pool, orgID, period)
	if err != nil {
		return nil, err
	}
	return &entity.WorkingPaperRosterPreview{OrganizationID: orgID, AssessmentCycle: period.MonitoringCycle, MonitoringCycle: period.MonitoringCycle,
		ProfileVersionID: period.ProfileID, ObservationCutoff: period.Cutoff, ProfileLabel: period.Label,
		Revision: profileRosterRevision(entries, period), Entries: entries, Summary: summary}, nil
}

func profileRosterRevision(entries []entity.WorkingPaperRosterEntry, period rosterPeriod) string {
	key := period.MonitoringCycle
	if period.ProfileID != nil {
		key += ":" + period.ProfileID.String() + ":" + period.Cutoff
		if period.PeriodID != nil {
			key += ":" + period.PeriodID.String()
		}
	}
	return computeRosterRevision(entries, key)
}

func nullableCutoff(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func parseQuarter(cycle string) (int, int, error) {
	parts := strings.SplitN(cycle, "-", 2)
	if len(parts) != 2 || (parts[1] != "Q1" && parts[1] != "Q2" && parts[1] != "Q3" && parts[1] != "Q4") {
		return 0, 0, domainerrors.ErrCycleFormat
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil || year < 2000 || year > 2100 {
		return 0, 0, fmt.Errorf("tahun tidak valid dalam siklus %q", cycle)
	}
	periodCode := strings.TrimPrefix(parts[1], "Q")
	quarter, err := strconv.Atoi(periodCode)
	if err != nil || quarter < 1 || quarter > 4 {
		return 0, 0, domainerrors.ErrCycleFormat
	}
	return year, quarter, nil
}

func omitemptyUUID(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	return id.String()
}

func computeRosterRevision(entries []entity.WorkingPaperRosterEntry, monitoringCycle string) string {
	h := sha256.New()
	for _, entry := range entries {
		fmt.Fprintf(h, "%s|%s|%s|%s|%s\n",
			entry.VersionGroupID,
			entry.SourceRiskID,
			omitemptyUUIDFromPtr(entry.MonitoringID),
			entry.MonitoringStatus,
			entry.RosterStatus,
		)
	}
	fmt.Fprintf(h, "%s\n", monitoringCycle)
	return hex.EncodeToString(h.Sum(nil))
}

func omitemptyUUIDFromPtr(id *uuid.UUID) string {
	if id == nil || *id == uuid.Nil {
		return ""
	}
	return id.String()
}

func (r *workingPaperRepository) PreviewPeriodRoster(ctx context.Context, orgID uuid.UUID, assessmentCycle string) (*entity.WorkingPaperRosterPreview, error) {
	period, err := resolveRosterPeriod(assessmentCycle)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, rosterPreviewQuery(),
		orgID,
		period.MonitoringCycle,
	)
	if err != nil {
		return nil, fmt.Errorf("preview period roster: %w", err)
	}
	defer rows.Close()

	entries := make([]entity.WorkingPaperRosterEntry, 0)
	summary := entity.WorkingPaperRosterSummary{}

	for rows.Next() {
		var entry entity.WorkingPaperRosterEntry
		var monitoringID, resultRiskID uuid.NullUUID
		var resultVersionNumber *int
		var monitoringStatus, monitoringCycle *string

		if err := rows.Scan(
			&entry.VersionGroupID,
			&entry.Code,
			&entry.Title,
			&entry.SourceRiskID,
			&entry.SourceVersionNumber,
			&monitoringID,
			&monitoringCycle,
			&monitoringStatus,
			&resultRiskID,
			&resultVersionNumber,
		); err != nil {
			return nil, fmt.Errorf("scan roster entry: %w", err)
		}

		entry.OrganizationID = orgID
		entry.MonitoringCycle = period.MonitoringCycle

		if monitoringID.Valid {
			entry.MonitoringID = &monitoringID.UUID
			if monitoringStatus != nil {
				entry.MonitoringStatus = *monitoringStatus
			}
			if monitoringCycle != nil {
				entry.MonitoringCycle = *monitoringCycle
			}
		}
		if resultRiskID.Valid {
			entry.ResultRiskID = &resultRiskID.UUID
		}
		if resultVersionNumber != nil {
			entry.ResultVersionNumber = resultVersionNumber
		}

		entry.RosterStatus = resolveRosterStatus(entry.MonitoringID, entry.MonitoringStatus)

		entries = append(entries, entry)
		summary.EligibleCount++

		switch entry.RosterStatus {
		case entity.WorkingPaperRosterNotStarted:
			summary.NotStartedCount++
		case entity.WorkingPaperRosterInProgress:
			summary.InProgressCount++
		case entity.WorkingPaperRosterFinalized:
			summary.FinalizedCount++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("roster preview rows: %w", err)
	}

	revision := computeRosterRevision(entries, period.MonitoringCycle)

	return &entity.WorkingPaperRosterPreview{
		OrganizationID:  orgID,
		AssessmentCycle: assessmentCycle,
		MonitoringCycle: period.MonitoringCycle,
		Revision:        revision,
		Entries:         entries,
		Summary:         summary,
	}, nil
}

func resolveRosterStatus(monitoringID *uuid.UUID, monitoringStatus string) string {
	if monitoringID == nil {
		return entity.WorkingPaperRosterNotStarted
	}
	switch monitoringStatus {
	case entity.RiskMonitoringStatusFinalized:
		return entity.WorkingPaperRosterFinalized
	case entity.RiskMonitoringStatusDraft:
		return entity.WorkingPaperRosterInProgress
	default:
		return entity.WorkingPaperRosterNotStarted
	}
}

func rosterPreviewQuery() string {
	// Keep assessment-cycle membership, but resolve archive/restore state at
	// the period cutoff. A later archive must not erase earlier working papers.
	return quarterlyLifecycleCTE + `, roster_cutoff AS (
			SELECT LEAST(
				(make_date(substring($2::text, 1, 4)::int,
				 (substring($2::text, 7, 1)::int - 1) * 3 + 1, 1)::timestamp
				 + interval '3 months') AT TIME ZONE 'Asia/Jakarta',
				` + businessNowSQL + `
			) AS cutoff
		), eligible_versions AS (
			SELECT DISTINCT ON (r.version_group_id)
				r.version_group_id,
				r.id AS risk_id,
				r.code,
				r.title,
				r.version_number
			FROM risks r CROSS JOIN roster_cutoff p
			WHERE r.organization_id = $1
			  AND r.status = 'final'
			  AND r.superseded_by_risk_id IS NULL
			  AND ` + riskEffectiveAtSQL + ` < p.cutoff
			ORDER BY r.version_group_id, ` + riskEffectiveAtSQL + ` DESC, r.version_number DESC
		),
		monitoring_lookup AS (
			SELECT DISTINCT ON (rm.version_group_id)
				rm.version_group_id,
				rm.id AS monitoring_id,
				rm.assessment_cycle AS m_cycle,
				rm.status AS m_status,
				rm.source_risk_id,
				rm.result_risk_id
			FROM risk_monitorings rm
			JOIN eligible_versions ev ON ev.version_group_id = rm.version_group_id
			WHERE rm.assessment_cycle = $2
			  AND rm.status IN ('draft', 'final')
              ORDER BY rm.version_group_id,(rm.status='final') DESC,rm.observed_at DESC,rm.finalized_at DESC NULLS LAST,rm.updated_at DESC,rm.id DESC
		),
		result_versions AS (
			SELECT
				rr.id,
				rr.version_number,
				rr.version_group_id
			FROM risks rr
			WHERE rr.id IN (SELECT result_risk_id FROM monitoring_lookup WHERE result_risk_id IS NOT NULL)
		)
		SELECT
			ev.version_group_id,
			ev.code,
			ev.title,
			COALESCE(ml.source_risk_id, ev.risk_id) AS source_risk_id,
			COALESCE(ms.version_number, ev.version_number) AS source_version_number,
			ml.monitoring_id,
			ml.m_cycle AS monitoring_cycle,
			ml.m_status AS monitoring_status,
			rv.id AS result_risk_id,
			rv.version_number AS result_version_number
		FROM eligible_versions ev
		CROSS JOIN roster_cutoff p
		LEFT JOIN lifecycle ON lifecycle.version_group_id = ev.version_group_id
		LEFT JOIN LATERAL (
			SELECT e.action
			FROM lifecycle_events e
			WHERE e.version_group_id = ev.version_group_id AND e.created_at < p.cutoff
			ORDER BY e.created_at DESC, e.id DESC
			LIMIT 1
		) last_event ON TRUE
		LEFT JOIN monitoring_lookup ml ON ml.version_group_id = ev.version_group_id
        LEFT JOIN risks ms ON ms.id=ml.source_risk_id
		LEFT JOIN result_versions rv ON rv.id = ml.result_risk_id
		WHERE CASE
			WHEN last_event.action IS NOT NULL THEN last_event.action <> 'archive'
			ELSE lifecycle.archived_at IS NULL OR lifecycle.archived_at >= p.cutoff
		END
		ORDER BY ev.code, ev.version_group_id
	`
}

const profileRosterQuery = `
 SELECT m.version_group_id, COALESCE(m.baseline->>'code',r.code,''), COALESCE(m.baseline->>'title',r.title,''),
        r.id,r.version_number,rm.id,rm.assessment_cycle,rm.status,result.id,result.version_number,COALESCE(rm.observed_at::text,'')
 FROM annual_risk_profile_members m
 JOIN annual_risk_profile_versions p ON p.id=m.profile_version_id
 JOIN risks r ON r.id=m.risk_id AND r.organization_id=p.organization_id
 LEFT JOIN LATERAL (
   SELECT rm.id,rm.assessment_cycle,rm.status,rm.result_risk_id,rm.observed_at
   FROM risk_monitorings rm
   WHERE rm.version_group_id=m.version_group_id AND rm.observed_at BETWEEN m.effective_from AND $3::date
     AND rm.status IN ('draft','final') AND rm.superseded_by_monitoring_id IS NULL
     AND (p.monitoring_rule_id IS NULL OR (rm.profile_version_id IN (SELECT ap.id FROM annual_risk_profile_versions ap WHERE ap.organization_id=p.organization_id AND ap.year=p.year) AND rm.monitoring_period_id=$4::uuid))
   ORDER BY (rm.status='final') DESC,rm.observed_at DESC,rm.finalized_at DESC NULLS LAST,rm.id DESC
   LIMIT 1
 ) rm ON TRUE
 LEFT JOIN risks result ON result.id=rm.result_risk_id
 WHERE p.organization_id=$1 AND p.id=$2 AND p.finalized_at IS NOT NULL AND (p.monitoring_rule_id IS NULL OR m.effective_from<=$3::date)
 ORDER BY r.code,m.version_group_id`

func (r *workingPaperRepository) CreateWithPeriodRoster(ctx context.Context, wp *entity.WorkingPaper, revision string, decisions []entity.WorkingPaperRosterDecision) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `SELECT 1 FROM organizations WHERE id = $1 FOR UPDATE`, wp.OrgID)
	if err != nil {
		return fmt.Errorf("lock organization: %w", err)
	}

	var period rosterPeriod
	if wp.ProfileVersionID != nil {
		period, err = resolveProfileRoster(ctx, tx, wp.OrgID, *wp.ProfileVersionID, wp.ObservationCutoff)
		if err != nil {
			return err
		}
		if wp.MonitoringPeriodID != nil {
			if err := assertConfiguredPeriod(ctx, tx, *wp.ProfileVersionID, *wp.MonitoringPeriodID, wp.OrgID); err != nil {
				return err
			}
			period.PeriodID = wp.MonitoringPeriodID
			var valid bool
			if err := tx.QueryRow(ctx, `SELECT monitoring_observation_in_period($1,$2,$3::date)`, wp.ProfileVersionID, wp.MonitoringPeriodID, period.Cutoff).Scan(&valid); err != nil {
				return err
			}
			if !valid {
				return monitoringInputError("Tanggal batas KK tidak sesuai periode kalender terpilih.")
			}
		}
		wp.AssessmentCycle, wp.ObservationCutoff = period.MonitoringCycle, period.Cutoff
		wp.Title = "KK Pemantauan dan Reviu · " + period.Label
	} else {
		period, err = resolveRosterPeriod(wp.AssessmentCycle)
		if err != nil {
			return err
		}
	}
	var existingCount int
	if err := tx.QueryRow(ctx, `
  SELECT COUNT(*) FROM working_papers WHERE org_id=$1 AND status <> 'cancelled'
  AND CASE WHEN $3::uuid IS NULL THEN assessment_cycle=$2 AND profile_version_id IS NULL
           ELSE CASE WHEN $5::uuid IS NOT NULL THEN profile_version_id IN (SELECT p.id FROM annual_risk_profile_versions p JOIN annual_risk_profile_versions selected ON selected.organization_id=p.organization_id AND selected.year=p.year WHERE selected.id=$3) AND monitoring_period_id=$5 ELSE profile_version_id=$3 AND monitoring_period_id IS NULL AND observation_cutoff=$4::date END END
 `, wp.OrgID, wp.AssessmentCycle, wp.ProfileVersionID, nullableCutoff(wp.ObservationCutoff), wp.MonitoringPeriodID).Scan(&existingCount); err != nil {
		return fmt.Errorf("check existing working paper: %w", err)
	}
	if existingCount > 0 && wp.MonitoringPeriodID != nil {
		var existingID uuid.UUID
		var state string
		if err := tx.QueryRow(ctx, `SELECT wp.id,wp.status FROM working_papers wp JOIN annual_risk_profile_versions p ON p.id=wp.profile_version_id JOIN annual_risk_profile_versions selected ON selected.organization_id=p.organization_id AND selected.year=p.year WHERE selected.id=$1 AND wp.monitoring_period_id=$2 AND wp.status<>'cancelled'`, wp.ProfileVersionID, wp.MonitoringPeriodID).Scan(&existingID, &state); err != nil {
			return err
		}
		if state == entity.WorkingPaperStatusDraft {
			existing, err := r.loadWorkingPaper(ctx, tx, existingID, false)
			if err != nil {
				return err
			}
			*wp = *existing
			return tx.Commit(ctx)
		}
	}
	if existingCount > 0 {
		message := fmt.Sprintf("Kertas kerja untuk kuartal %s sudah ada.", wp.AssessmentCycle)
		if wp.ProfileVersionID != nil {
			message = "KK untuk profil dan tanggal batas ini sudah ada."
		}
		return &domainerrors.AppError{Code: "SEMESTER_CONFLICT", Message: message}
	}

	entries, _, err := scanRosterPreview(ctx, tx, wp.OrgID, period)
	if err != nil {
		return fmt.Errorf("recompute roster preview: %w", err)
	}

	currentRevision := profileRosterRevision(entries, period)
	if wp.ProfileVersionID != nil && len(entries) == 0 {
		return &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Profil ini belum berisi risiko."}
	}
	if currentRevision != revision {
		return &domainerrors.AppError{
			Code:    "ROSTER_STALE",
			Message: "daftar risiko atau status monitoring berubah. Muat ulang roster sebelum membuat kertas kerja.",
		}
	}

	decisionByGroup := make(map[uuid.UUID]entity.WorkingPaperRosterDecision, len(decisions))
	for _, d := range decisions {
		decisionByGroup[d.VersionGroupID] = d
	}
	for _, entry := range entries {
		if wp.ProfileVersionID != nil {
			decisionByGroup[entry.VersionGroupID] = entity.WorkingPaperRosterDecision{VersionGroupID: entry.VersionGroupID, Included: true}
			continue
		}
		if _, ok := decisionByGroup[entry.VersionGroupID]; !ok {
			return &domainerrors.AppError{
				Code:    "ROSTER_STALE",
				Message: "keputusan roster tidak cocok dengan data terbaru. Muat ulang roster.",
			}
		}
	}

	sequenceNo, err := nextWPScopeSequence(ctx, tx, wp.OrgID, wp.AssessmentCycle)
	if err != nil {
		return fmt.Errorf("reserve working paper sequence: %w", err)
	}
	wp.SequenceNo = sequenceNo
	if wp.ProfileVersionID != nil {
		wp.Code = fmt.Sprintf("KK-%s-%d", wp.ObservationCutoff, sequenceNo)
	} else {
		wp.Code = fmt.Sprintf("KK-%s-%d", wp.AssessmentCycle, sequenceNo)
	}

	if err := tx.QueryRow(ctx, `
		INSERT INTO working_papers (id, code, sequence_no, title, org_id, status, assessment_cycle, document_hash, current_signatory_sequence, tte_skipped, created_by, created_at, updated_at, profile_version_id, observation_cutoff,monitoring_period_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING created_at
	`, wp.ID, wp.Code, wp.SequenceNo, wp.Title, wp.OrgID, wp.Status, wp.AssessmentCycle,
		wp.DocumentHash, wp.CurrentSignatorySequence, wp.TTESkipped, wp.CreatedBy, wp.CreatedAt, wp.UpdatedAt, wp.ProfileVersionID, nullableCutoff(wp.ObservationCutoff), wp.MonitoringPeriodID,
	).Scan(&wp.CreatedAt); err != nil {
		return fmt.Errorf("insert working paper: %w", err)
	}

	// Discover the actual columns on working_paper_risks by using a direct insert
	sortOrder := 0
	for _, entry := range entries {
		decision := decisionByGroup[entry.VersionGroupID]
		if !decision.Included {
			if _, err := tx.Exec(ctx, `
				INSERT INTO working_paper_risk_exclusions (working_paper_id, version_group_id, assessment_cycle, reason, excluded_by)
				VALUES ($1,$2,$3,$4,$5)
			`, wp.ID, entry.VersionGroupID, period.MonitoringCycle, decision.ExclusionReason, wp.CreatedBy); err != nil {
				return fmt.Errorf("insert exclusion: %w", err)
			}
			continue
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO working_paper_risks (working_paper_id, risk_id, sort_order, source_mode, version_group_id, source_risk_id, monitoring_id, result_risk_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		`, wp.ID, entry.SourceRiskID, sortOrder, "roster", entry.VersionGroupID, entry.SourceRiskID, entry.MonitoringID, entry.ResultRiskID); err != nil {
			return fmt.Errorf("insert working paper risk link: %w", err)
		}

		sortOrder++
	}

	for _, sig := range wp.Signatories {
		if _, err := tx.Exec(ctx, `
			INSERT INTO working_paper_signatories (id, working_paper_id, user_id, sequence_no, signer_name, signer_nip, signer_jabatan, signer_pangkat, status)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		`, sig.ID, wp.ID, sig.UserID, sig.SequenceNo, sig.SignerName, sig.SignerNIP, sig.SignerJabatan, sig.SignerPangkat, sig.Status); err != nil {
			return fmt.Errorf("insert signatory: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	return nil
}

type rosterQuerier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func scanRosterPreview(ctx context.Context, q rosterQuerier, orgID uuid.UUID, period rosterPeriod) ([]entity.WorkingPaperRosterEntry, entity.WorkingPaperRosterSummary, error) {
	query := rosterPreviewQuery()
	args := []any{orgID, period.MonitoringCycle}
	if period.ProfileID != nil {
		query = profileRosterQuery
		args = []any{orgID, period.ProfileID, period.Cutoff, period.PeriodID}
	}
	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, entity.WorkingPaperRosterSummary{}, err
	}
	defer rows.Close()

	entries := make([]entity.WorkingPaperRosterEntry, 0)
	summary := entity.WorkingPaperRosterSummary{}

	for rows.Next() {
		var entry entity.WorkingPaperRosterEntry
		var monitoringID, resultRiskID uuid.NullUUID
		var resultVersionNumber *int
		var monitoringStatus, monitoringCycle *string

		dest := []any{
			&entry.VersionGroupID,
			&entry.Code,
			&entry.Title,
			&entry.SourceRiskID,
			&entry.SourceVersionNumber,
			&monitoringID,
			&monitoringCycle,
			&monitoringStatus,
			&resultRiskID,
			&resultVersionNumber,
		}
		if period.ProfileID != nil {
			dest = append(dest, &entry.ObservedAt)
		}
		if err := rows.Scan(dest...); err != nil {
			return nil, entity.WorkingPaperRosterSummary{}, fmt.Errorf("scan roster entry: %w", err)
		}

		entry.OrganizationID = orgID
		entry.MonitoringCycle = period.MonitoringCycle

		if monitoringID.Valid {
			entry.MonitoringID = &monitoringID.UUID
			if monitoringStatus != nil {
				entry.MonitoringStatus = *monitoringStatus
			}
			if monitoringCycle != nil {
				entry.MonitoringCycle = *monitoringCycle
			}
		}
		if resultRiskID.Valid {
			entry.ResultRiskID = &resultRiskID.UUID
		}

		if resultVersionNumber != nil {
			entry.ResultVersionNumber = resultVersionNumber
		}

		entry.RosterStatus = resolveRosterStatus(entry.MonitoringID, entry.MonitoringStatus)

		entries = append(entries, entry)
		summary.EligibleCount++

		switch entry.RosterStatus {
		case entity.WorkingPaperRosterNotStarted:
			summary.NotStartedCount++
		case entity.WorkingPaperRosterInProgress:
			summary.InProgressCount++
		case entity.WorkingPaperRosterFinalized:
			summary.FinalizedCount++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, entity.WorkingPaperRosterSummary{}, err
	}

	return entries, summary, nil
}

func (r *workingPaperRepository) ListSigningBlockers(ctx context.Context, workingPaperID uuid.UUID) ([]entity.WorkingPaperSigningBlocker, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT wpr.version_group_id, source.code, source.title,
		       COALESCE(monitoring.status, 'missing')
		FROM working_paper_risks wpr
		JOIN working_papers wp ON wp.id = wpr.working_paper_id
		JOIN risks source ON source.id = COALESCE(wpr.source_risk_id, wpr.risk_id)
		LEFT JOIN LATERAL (
			SELECT rm.status
			FROM risk_monitorings rm
			JOIN risks monitoring_source ON monitoring_source.id = rm.source_risk_id
			WHERE monitoring_source.version_group_id = COALESCE(wpr.version_group_id, source.version_group_id)
			  AND `+workingPaperObservationScopeSQL+`
			  AND rm.status IN ('draft', 'final')
			ORDER BY CASE rm.status WHEN 'final' THEN 0 ELSE 1 END, rm.observed_at DESC, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
			LIMIT 1
		) monitoring ON TRUE
		WHERE wpr.working_paper_id = $1
		  AND wpr.version_group_id IS NOT NULL
		  AND (monitoring.status IS NULL OR monitoring.status <> 'final')
		ORDER BY wpr.sort_order
	`, workingPaperID)
	if err != nil {
		return nil, fmt.Errorf("list signing blockers: %w", err)
	}
	defer rows.Close()

	blockers := make([]entity.WorkingPaperSigningBlocker, 0)
	for rows.Next() {
		var blocker entity.WorkingPaperSigningBlocker
		if err := rows.Scan(&blocker.VersionGroupID, &blocker.Code, &blocker.Title, &blocker.MonitoringStatus); err != nil {
			return nil, fmt.Errorf("scan signing blocker: %w", err)
		}
		blockers = append(blockers, blocker)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("signing blocker rows: %w", err)
	}
	return blockers, nil
}

func nextWPScopeSequence(ctx context.Context, q workingPaperTx, orgID uuid.UUID, cycle string) (int, error) {
	var seq int
	if err := q.QueryRow(ctx, `
		SELECT COALESCE(MAX(sequence_no), 0) + 1
		FROM working_papers
		WHERE org_id = $1
	`, orgID).Scan(&seq); err != nil {
		return 0, fmt.Errorf("next working paper sequence: %w", err)
	}
	return seq, nil
}

func (r *workingPaperRepository) PreviewConfiguredProfileRoster(ctx context.Context, org, profile, periodID uuid.UUID, cutoff string) (*entity.WorkingPaperRosterPreview, error) {
	period, err := resolveProfileRoster(ctx, r.pool, org, profile, cutoff)
	if err != nil {
		return nil, err
	}
	period.PeriodID = &periodID
	var valid bool
	if err := r.pool.QueryRow(ctx, `SELECT monitoring_observation_in_period($1,$2,$3::date)`, profile, periodID, period.Cutoff).Scan(&valid); err != nil {
		return nil, err
	}
	if !valid {
		return nil, monitoringInputError("Pilih tanggal batas dalam periode profil yang dipilih.")
	}
	entries, summary, err := scanRosterPreview(ctx, r.pool, org, period)
	if err != nil {
		return nil, err
	}
	return &entity.WorkingPaperRosterPreview{ProfileVersionID: &profile, MonitoringPeriodID: &periodID, ObservationCutoff: period.Cutoff, ProfileLabel: period.Label, OrganizationID: org, AssessmentCycle: period.MonitoringCycle, MonitoringCycle: period.MonitoringCycle, Revision: profileRosterRevision(entries, period), Entries: entries, Summary: summary}, nil
}
