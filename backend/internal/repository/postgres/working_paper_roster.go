package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type rosterPeriod struct {
	MonitoringCycle string
}

func resolveRosterPeriod(cycle string) (rosterPeriod, error) {
	if _, _, err := parseSemester(cycle); err != nil {
		return rosterPeriod{}, err
	}
	return rosterPeriod{MonitoringCycle: cycle}, nil
}

func parseSemester(cycle string) (int, int, error) {
	parts := strings.SplitN(cycle, "-", 2)
	if len(parts) != 2 || (parts[1] != "H1" && parts[1] != "H2") {
		return 0, 0, domainerrors.ErrSemesterFormat
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil || year < 2000 || year > 2100 {
		return 0, 0, fmt.Errorf("tahun tidak valid dalam siklus %q", cycle)
	}
	var half int
	if parts[1] == "H1" {
		half = 1
	} else {
		half = 2
	}
	return year, half, nil
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
		case entity.WorkingPaperRosterFinalizedResult:
			summary.FinalizedCount++
		case entity.WorkingPaperRosterExistingDraft:
			summary.ExistingDraftCount++
		case entity.WorkingPaperRosterDraftWillBeCreated:
			summary.NewDraftCount++
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
		return entity.WorkingPaperRosterDraftWillBeCreated
	}
	switch monitoringStatus {
	case entity.RiskMonitoringStatusFinalized:
		return entity.WorkingPaperRosterFinalizedResult
	case entity.RiskMonitoringStatusDraft:
		return entity.WorkingPaperRosterExistingDraft
	default:
		return entity.WorkingPaperRosterDraftWillBeCreated
	}
}

func rosterPreviewQuery() string {
	return `
		WITH eligible_versions AS (
			SELECT DISTINCT ON (r.version_group_id)
				r.version_group_id,
				r.id AS risk_id,
				r.code,
				r.title,
				r.version_number
			FROM risks r
			WHERE r.organization_id = $1
			  AND r.status = 'approved'
			  AND r.assessment_cycle = $2
			ORDER BY r.version_group_id, r.version_number DESC
		),
		monitoring_lookup AS (
			SELECT
				rm.version_group_id,
				rm.id AS monitoring_id,
				rm.assessment_cycle AS m_cycle,
				rm.status AS m_status,
				rm.source_risk_id,
				rm.result_risk_id
			FROM risk_monitorings rm
			JOIN eligible_versions ev ON ev.version_group_id = rm.version_group_id
			WHERE rm.assessment_cycle = $2
			  AND rm.status IN ('draft', 'finalized')
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
			ev.version_number AS source_version_number,
			ml.monitoring_id,
			ml.m_cycle AS monitoring_cycle,
			ml.m_status AS monitoring_status,
			rv.id AS result_risk_id,
			rv.version_number AS result_version_number
		FROM eligible_versions ev
		LEFT JOIN monitoring_lookup ml ON ml.version_group_id = ev.version_group_id
		LEFT JOIN result_versions rv ON rv.id = ml.result_risk_id
		ORDER BY ev.code, ev.version_group_id
	`
}

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

	var existingCount int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM working_papers
		WHERE org_id = $1 AND assessment_cycle = $2 AND status != 'cancelled'
	`, wp.OrgID, wp.AssessmentCycle).Scan(&existingCount); err != nil {
		return fmt.Errorf("check existing working paper: %w", err)
	}
	if existingCount > 0 {
		return &domainerrors.AppError{
			Code:    "SEMESTER_CONFLICT",
			Message: fmt.Sprintf("Kertas kerja untuk semester %s sudah ada (tidak termasuk yang dibatalkan). Batalkan kertas kerja yang ada terlebih dahulu atau gunakan semester lain.", wp.AssessmentCycle),
		}
	}

	period, err := resolveRosterPeriod(wp.AssessmentCycle)
	if err != nil {
		return err
	}

	entries, _, err := scanRosterPreview(ctx, tx, wp.OrgID, period)
	if err != nil {
		return fmt.Errorf("recompute roster preview: %w", err)
	}

	currentRevision := computeRosterRevision(entries, period.MonitoringCycle)
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
	wp.Code = fmt.Sprintf("KK-%s-%d", wp.AssessmentCycle, sequenceNo)

	wp.DocumentHash = wp.ComputeHash()

	if err := tx.QueryRow(ctx, `
		INSERT INTO working_papers (id, code, sequence_no, title, org_id, status, assessment_cycle, document_hash, current_signatory_sequence, tte_skipped, created_by, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING created_at
	`, wp.ID, wp.Code, wp.SequenceNo, wp.Title, wp.OrgID, wp.Status, wp.AssessmentCycle,
		wp.DocumentHash, wp.CurrentSignatorySequence, wp.TTESkipped, wp.CreatedBy, wp.CreatedAt, wp.UpdatedAt,
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

		monitoringID := entry.MonitoringID
		if entry.RosterStatus == entity.WorkingPaperRosterDraftWillBeCreated {
			sourceRisk, err := getRiskByIDWithQueryer(ctx, tx, entry.SourceRiskID)
			if err != nil {
				return fmt.Errorf("resolve source risk for monitoring draft: %w", err)
			}
			draft := entity.NewRiskMonitoringDraft(sourceRisk, period.MonitoringCycle, wp.CreatedBy)
			if err := insertRiskMonitoring(ctx, tx, draft); err != nil {
				return fmt.Errorf("create monitoring draft: %w", err)
			}
			monitoringID = &draft.ID
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO working_paper_risks (working_paper_id, risk_id, sort_order, source_mode, version_group_id, source_risk_id, monitoring_id, result_risk_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		`, wp.ID, entry.SourceRiskID, sortOrder, "roster", entry.VersionGroupID, entry.SourceRiskID, monitoringID, entry.ResultRiskID); err != nil {
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
	rows, err := q.Query(ctx, rosterPreviewQuery(),
		orgID,
		period.MonitoringCycle,
	)
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
		case entity.WorkingPaperRosterFinalizedResult:
			summary.FinalizedCount++
		case entity.WorkingPaperRosterExistingDraft:
			summary.ExistingDraftCount++
		case entity.WorkingPaperRosterDraftWillBeCreated:
			summary.NewDraftCount++
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
		       COALESCE(rm.status, 'missing')
		FROM working_paper_risks wpr
		JOIN risks source ON source.id = COALESCE(wpr.source_risk_id, wpr.risk_id)
		LEFT JOIN risk_monitorings rm ON rm.id = wpr.monitoring_id
		WHERE wpr.working_paper_id = $1
		  AND wpr.version_group_id IS NOT NULL
		  AND (rm.id IS NULL OR rm.status <> 'finalized')
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
