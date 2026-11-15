package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/timeutil"
)

type riskMonitoringRepository struct {
	pool repositoryDB
}

func NewRiskMonitoringRepository(pool *pgxpool.Pool) repository.RiskMonitoringRepository {
	return &riskMonitoringRepository{pool: pool}
}

type riskMonitoringQueryer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func (r *riskMonitoringRepository) Create(ctx context.Context, monitoring *entity.RiskMonitoring) error {
	if monitoring.ObservedAt == "" {
		monitoring.ObservedAt = monitoring.StartedAt.In(timeutil.JakartaLocation()).Format(time.DateOnly)
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if monitoring.Status == entity.RiskMonitoringStatusDraft {
		if err := lockRiskWorkflow(ctx, tx, monitoring.VersionGroupID); err != nil {
			return err
		}
		if err := checkMonitoringDraftStart(ctx, tx, monitoring.VersionGroupID, monitoring.TransactionKind); err != nil {
			return err
		}
	}
	if monitoring.Status == entity.RiskMonitoringStatusDraft && monitoring.ProfileVersionID == nil {
		var exists bool
		if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM risk_monitorings WHERE version_group_id=$1 AND status='draft' AND transaction_kind=$2)", monitoring.VersionGroupID, monitoring.TransactionKind).Scan(&exists); err != nil {
			return fmt.Errorf("check open monitoring draft: %w", err)
		}
		if exists {
			return domainerrors.ErrMonitoringNotDraft
		}
	}
	if monitoring.TransactionKind == "monitoring" {
		var probability, impact int
		err := tx.QueryRow(ctx, `SELECT observed_probability,observed_impact FROM risk_monitorings WHERE source_risk_id=$1 AND status='final' AND transaction_kind='monitoring' AND superseded_by_monitoring_id IS NULL AND observed_at<=$2::date ORDER BY observed_at DESC,finalized_at DESC,id DESC LIMIT 1`, monitoring.SourceRiskID, monitoring.ObservedAt).Scan(&probability, &impact)
		if err == nil {
			monitoring.SourceProbability = probability
			monitoring.SourceImpact = impact
			monitoring.SourceWeight = entity.GetBobot(probability, impact)
			monitoring.SourceNilai = entity.CalculateNilai(probability, impact, monitoring.SourceWeight)
			monitoring.SourceLevel = entity.GetRiskLevelFromNilai(monitoring.SourceNilai)
			monitoring.ObservedProbability = probability
			monitoring.ObservedImpact = impact
			monitoring.CalculateObservedScore()
		}
		if err != nil && err != pgx.ErrNoRows {
			return err
		}
	}
	if err := insertRiskMonitoring(ctx, tx, monitoring); err != nil {
		return err
	}
	if monitoring.TransactionKind == "monitoring" {
		if err := ensureMonitoringReportTasks(ctx, tx, monitoring); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func insertRiskMonitoring(
	ctx context.Context,
	q riskMonitoringQueryer,
	monitoring *entity.RiskMonitoring,
) error {
	if monitoring.ObservedAt == "" {
		monitoring.ObservedAt = monitoring.StartedAt.In(timeutil.JakartaLocation()).Format("2006-01-02")
	}
	if err := monitoring.Validate(); err != nil {
		return err
	}
	monitoring.NormalizeNilaiForStorage()
	profileChanges, err := json.Marshal(monitoring.ProfileChangeSummary)
	if err != nil {
		return fmt.Errorf("marshal profile changes: %w", err)
	}
	draftPayload := mustJSON(monitoring.DraftPayloadSnapshot())
	err = q.QueryRow(ctx, `
		INSERT INTO risk_monitorings (
			source_risk_id, version_group_id, result_risk_id, assessment_cycle, status, mode,
			source_probability, source_impact, source_weight, source_nilai, source_level, source_version_number,
			observed_probability, observed_impact, observed_weight, observed_nilai, observed_level,
			conclusion,
			mitigation_progress_summary, mitigation_completion_percent,
			draft_payload,
			profile_change_summary, change_reason, started_by, started_at, observed_at, observed_at_inferred,profile_version_id,monitoring_period_id,transaction_kind,finalized_at,finalized_by
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
		RETURNING id, started_at, created_at, updated_at`,
		monitoring.SourceRiskID,
		monitoring.VersionGroupID,
		monitoring.ResultRiskID,
		monitoring.AssessmentCycle,
		monitoring.Status,
		monitoring.Mode,
		monitoring.SourceProbability,
		monitoring.SourceImpact,
		monitoring.SourceWeight,
		monitoring.SourceNilai,
		monitoring.SourceLevel,
		monitoring.SourceVersionNumber,
		monitoring.ObservedProbability,
		monitoring.ObservedImpact,
		monitoring.ObservedWeight,
		monitoring.ObservedNilai,
		monitoring.ObservedLevel,
		monitoring.Conclusion,
		monitoring.MitigationProgressSummary,
		monitoring.MitigationCompletionPercent,
		draftPayload,
		profileChanges,
		monitoring.ChangeReason,
		monitoring.StartedBy,
		monitoring.StartedAt,
		monitoring.ObservedAt,
		monitoring.ObservedAtInferred, monitoring.ProfileVersionID, monitoring.MonitoringPeriodID, monitoring.TransactionKind, monitoring.FinalizedAt, monitoring.FinalizedBy,
	).Scan(&monitoring.ID, &monitoring.StartedAt, &monitoring.CreatedAt, &monitoring.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create risk monitoring: %w", err)
	}
	return nil
}

func (r *riskMonitoringRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoring, error) {
	monitoring, err := scanRiskMonitoring(r.pool.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.id = $1`, id))
	if err != nil {
		return nil, err
	}
	if len(orgIDs) > 0 {
		if monitoring.SourceRisk != nil && !containsUUID(orgIDs, monitoring.SourceRisk.OrganizationID) {
			return nil, pgx.ErrNoRows
		}
	}

	return monitoring, nil
}

func (r *riskMonitoringRepository) GetDraftBySourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (*entity.RiskMonitoring, error) {
	monitoring, err := scanRiskMonitoring(r.pool.QueryRow(ctx, baseRiskMonitoringSelect()+`
		WHERE rm.source_risk_id = $1 AND rm.assessment_cycle = $2 AND rm.status = 'draft' AND rm.transaction_kind='monitoring'
	`, sourceRiskID, cycle))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return monitoring, nil
}

func (r *riskMonitoringRepository) HasFinalizedForSourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (bool, error) {
	var exists bool
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM risk_monitorings
			WHERE source_risk_id = $1
			  AND assessment_cycle = $2
			  AND status = 'final' AND transaction_kind='monitoring'
		)
	`, sourceRiskID, cycle).Scan(&exists); err != nil {
		return false, fmt.Errorf("check finalized monitoring: %w", err)
	}
	return exists, nil
}

func (r *riskMonitoringRepository) GetByVersionGroupAndCycle(ctx context.Context, versionGroupID uuid.UUID, cycle string) (*entity.RiskMonitoring, error) {
	monitoring, err := scanRiskMonitoring(r.pool.QueryRow(ctx, baseRiskMonitoringSelect()+`
		JOIN risks rv ON rv.id = rm.source_risk_id
		WHERE rv.version_group_id = $1 AND rm.assessment_cycle = $2
		  AND rm.status IN ('draft', 'final') AND rm.transaction_kind='monitoring'
		ORDER BY (rm.status='draft') DESC, rm.observed_at DESC, rm.finalized_at DESC NULLS LAST, rm.id DESC
		LIMIT 1
	`, versionGroupID, cycle))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return monitoring, nil
}

func (r *riskMonitoringRepository) ListByVersionGroup(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.RiskMonitoring, error) {
	rows, err := r.pool.Query(ctx, baseRiskMonitoringSelect()+`
		JOIN risks rv ON rv.id = rm.source_risk_id
		WHERE rv.version_group_id = $1
		ORDER BY rm.observed_at DESC, rm.finalized_at DESC NULLS LAST, rm.id DESC
	`, versionGroupID)
	if err != nil {
		return nil, fmt.Errorf("list monitorings by version group: %w", err)
	}
	defer rows.Close()

	var items []*entity.RiskMonitoring
	for rows.Next() {
		item, err := scanRiskMonitoring(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration: %w", err)
	}

	return items, nil
}

func (r *riskMonitoringRepository) List(ctx context.Context, filter repository.RiskMonitoringListFilter) ([]*entity.RiskMonitoring, int, error) {
	if filter.Status == "finalized" {
		filter.Status = entity.RiskMonitoringStatusFinal
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}

	countQuery := `
		SELECT COUNT(*)
		FROM risk_monitorings rm
		LEFT JOIN risks src ON src.id = rm.source_risk_id
		LEFT JOIN organizations src_org ON src_org.id = src.organization_id
		WHERE rm.status <> 'superseded'`
	dataQuery := baseRiskMonitoringSelect() + `
		WHERE rm.status <> 'superseded'`

	args := make([]any, 0, 8)
	argIdx := 1

	if len(filter.OrgIDs) > 0 {
		clause := fmt.Sprintf(" AND src.organization_id = ANY($%d::uuid[])", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.OrgIDs)
		argIdx++
	}

	switch filter.Lifecycle {
	case "", "active":
		countQuery += " AND src.archived_at IS NULL"
		dataQuery += " AND src.archived_at IS NULL"
	case "archived":
		countQuery += " AND src.archived_at IS NOT NULL"
		dataQuery += " AND src.archived_at IS NOT NULL"
	case "all":
	}

	if filter.Status != "" && filter.Status != "all" {
		clause := fmt.Sprintf(" AND rm.status = $%d", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.AssessmentCycle != "" {
		clause := fmt.Sprintf(" AND rm.assessment_cycle = $%d", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.AssessmentCycle)
		argIdx++
	}

	if filter.Category != "" && filter.Category != "all" {
		clause := fmt.Sprintf(" AND src.category = $%d", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.Category)
		argIdx++
	}

	if filter.CreatedAt != "" {
		clause := fmt.Sprintf(" AND rm.created_at::date = $%d::date", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.CreatedAt)
		argIdx++
	}

	if filter.Query != "" {
		clause := fmt.Sprintf(` AND (
			COALESCE(src.code, '') ILIKE $%d OR
			COALESCE(src.title, '') ILIKE $%d OR
			COALESCE(rm.draft_payload->>'title', '') ILIKE $%d OR
			COALESCE(rm.draft_payload->>'category', '') ILIKE $%d OR
			COALESCE(rm.draft_payload->>'riskSource', '') ILIKE $%d OR
			CONCAT_WS(' ', src.code, src.title, src_org.name) ILIKE $%d
		)`, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, "%"+filter.Query+"%")
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list risk monitoring count: %w", err)
	}

	const sourceScore = `COALESCE(CASE WHEN rm.source_nilai > 0 THEN rm.source_nilai END, CASE WHEN src.nilai > 0 THEN src.nilai END)`
	const observedScore = `CASE WHEN rm.observed_nilai > 0 THEN rm.observed_nilai END`
	sortColumns := map[string]string{
		"title":                         "LOWER(COALESCE(NULLIF(src.title, ''), NULLIF(rm.draft_payload->>'title', ''), res.title))",
		"assessment_cycle":              "rm.assessment_cycle",
		"status":                        "rm.status",
		"observed_at":                   "rm.observed_at",
		"started_at":                    "rm.started_at",
		"score_change":                  "(" + observedScore + ") - (" + sourceScore + ")",
		"observed_score":                observedScore,
		"mitigation_completion_percent": "mitigation_completion_percent",
	}
	tieBreaker := "rm.id"
	if _, explicit := sortColumns[filter.SortBy]; explicit {
		tieBreaker = "rm.created_at DESC NULLS LAST, rm.id"
	}
	dataQuery += " ORDER BY " + collectionOrderBy(filter.SortBy, filter.SortOrder, "rm.created_at", tieBreaker, sortColumns)
	dataQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, filter.Limit, (filter.Page-1)*filter.Limit)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk monitoring query: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskMonitoring, 0)
	for rows.Next() {
		item, err := scanRiskMonitoring(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list risk monitoring rows: %w", err)
	}

	return items, total, nil
}

func (r *riskMonitoringRepository) UpdateDraft(ctx context.Context, monitoring *entity.RiskMonitoring) error {
	monitoring.NormalizeNilaiForStorage()
	profileChanges, err := json.Marshal(monitoring.ProfileChangeSummary)
	if err != nil {
		return fmt.Errorf("marshal profile changes: %w", err)
	}
	draftPayload := mustJSON(monitoring.DraftPayloadSnapshot())
	err = r.pool.QueryRow(ctx, `
		UPDATE risk_monitorings
		SET mode = $2,
		    observed_probability = $3,
		    observed_impact = $4,
			observed_weight = $5,
			observed_nilai = $6,
			observed_level = $7,
			conclusion = $8,
			mitigation_progress_summary = $9,
			mitigation_completion_percent = $10,
			draft_payload = $11,
			profile_change_summary = $12,
			change_reason = $13,
			observed_at = $15::date,
			assessment_cycle = $16,
			observed_at_inferred = $17,
		    updated_at = clock_timestamp()
		WHERE id = $1 AND status = 'draft' AND updated_at = $14
		RETURNING updated_at
	`,
		monitoring.ID,
		monitoring.Mode,
		monitoring.ObservedProbability,
		monitoring.ObservedImpact,
		monitoring.ObservedWeight,
		monitoring.ObservedNilai,
		monitoring.ObservedLevel,
		monitoring.Conclusion,
		monitoring.MitigationProgressSummary,
		monitoring.MitigationCompletionPercent,
		draftPayload,
		profileChanges,
		monitoring.ChangeReason,
		monitoring.UpdatedAt,
		monitoring.ObservedAt,
		monitoring.AssessmentCycle,
		monitoring.ObservedAtInferred,
	).Scan(&monitoring.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domainerrors.ErrMonitoringReviewChanged
	}
	if err != nil {
		return fmt.Errorf("update monitoring draft: %w", err)
	}
	return nil
}

func (r *riskMonitoringRepository) DeleteDraft(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin monitoring draft deletion: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	statusQuery := `
		SELECT rm.status
		FROM risk_monitorings rm
		JOIN risks src ON src.id = rm.source_risk_id
		WHERE rm.id = $1`
	statusArgs := []any{id}
	if len(orgIDs) > 0 {
		statusQuery += ` AND src.organization_id = ANY($2::uuid[])`
		statusArgs = append(statusArgs, orgIDs)
	}
	statusQuery += ` FOR UPDATE OF rm`
	if err := tx.QueryRow(ctx, statusQuery, statusArgs...).Scan(&status); err != nil {
		return err
	}
	if status != entity.RiskMonitoringStatusDraft {
		return domainerrors.ErrMonitoringNotDeletable
	}

	var hasWorkingPaperReference bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM working_paper_risks
			WHERE monitoring_id = $1
		)`, id).Scan(&hasWorkingPaperReference); err != nil {
		return fmt.Errorf("check monitoring draft references: %w", err)
	}
	if hasWorkingPaperReference {
		return domainerrors.ErrMonitoringHasWorkingPaper
	}

	if _, err := tx.Exec(ctx, "DELETE FROM mitigation_tasks WHERE monitoring_id=$1", id); err != nil {
		return fmt.Errorf("delete draft mitigation reports: %w", err)
	}
	tag, err := tx.Exec(ctx, `
		DELETE FROM risk_monitorings
		WHERE id = $1 AND status = 'draft'`, id)
	if err != nil {
		return fmt.Errorf("delete monitoring draft: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit monitoring draft deletion: %w", err)
	}
	return nil
}

func (r *riskMonitoringRepository) Finalize(ctx context.Context, monitoringID uuid.UUID, resultRisk *entity.Risk, finalizedBy uuid.UUID, review repository.MonitoringFinalizeReview) (*entity.RiskMonitoring, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin monitoring finalization: %w", err)
	}
	defer tx.Rollback(ctx)

	monitoring, err := scanRiskMonitoring(tx.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.id = $1 FOR UPDATE OF rm`, monitoringID))
	if err != nil {
		return nil, err
	}
	if monitoring.Status == entity.RiskMonitoringStatusFinal {
		return monitoring, nil
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, domainerrors.ErrMonitoringNotFinalizable
	}

	if !review.DraftUpdatedAt.IsZero() && !monitoring.UpdatedAt.Equal(review.DraftUpdatedAt) {
		return nil, domainerrors.ErrMonitoringReviewChanged
	}
	if review.ReportRevision != nil {
		if _, err := tx.Exec(ctx, "SELECT id FROM mitigation_tasks WHERE monitoring_id = $1 ORDER BY id FOR UPDATE", monitoringID); err != nil {
			return nil, fmt.Errorf("lock mitigation tasks for finalization: %w", err)
		}
		counts, err := (&mitigationTaskRepository{pool: tx}).CountByMonitoringAndStatus(ctx, monitoringID, nil)
		if err != nil {
			return nil, err
		}
		if counts.Revision != *review.ReportRevision {
			return nil, domainerrors.ErrMonitoringReviewChanged
		}
	}

	if monitoring.TransactionKind == "monitoring" {
		if _, err := tx.Exec(ctx, "SELECT id FROM mitigation_tasks WHERE monitoring_id=$1 ORDER BY id FOR UPDATE", monitoringID); err != nil {
			return nil, err
		}
		var missing int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM mitigation_tasks WHERE monitoring_id=$1 AND (status NOT IN ('pending','done','skipped') OR reported_at IS NULL OR length(btrim(COALESCE(notes,'')))<10)`, monitoringID).Scan(&missing); err != nil {
			return nil, err
		}
		if missing > 0 {
			return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Lengkapi laporan seluruh rencana mitigasi sebelum finalisasi pemantauan."}
		}
	}
	var activeID uuid.UUID
	var activeEffective time.Time
	err = tx.QueryRow(ctx, `SELECT id,COALESCE(effective_from,finalized_at::date,created_at::date) FROM risks WHERE version_group_id=$1 AND is_current AND status='final' AND archived_at IS NULL FOR UPDATE`, monitoring.VersionGroupID).Scan(&activeID, &activeEffective)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrSourceRiskNoLongerActive
	}
	if err != nil {
		return nil, fmt.Errorf("lock active risk for finalization: %w", err)
	}
	now := timeutil.BusinessNow().UTC()
	observed, err := time.ParseInLocation("2006-01-02", monitoring.ObservedAt, timeutil.JakartaLocation())
	if err != nil || monitoring.ObservedAt > now.In(timeutil.JakartaLocation()).Format("2006-01-02") {
		return nil, domainerrors.ErrInvalidInput
	}
	source, err := getRiskByIDWithQueryer(ctx, tx, monitoring.SourceRiskID)
	if err != nil {
		return nil, err
	}
	var expectedSourceID uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT id FROM risks WHERE version_group_id=$1 AND status='final' AND archived_at IS NULL AND superseded_by_risk_id IS NULL
	 AND COALESCE(effective_from,(finalized_at AT TIME ZONE 'Asia/Jakarta')::date,(created_at AT TIME ZONE 'Asia/Jakarta')::date)<=$2::date
	 ORDER BY COALESCE(effective_from,(finalized_at AT TIME ZONE 'Asia/Jakarta')::date,(created_at AT TIME ZONE 'Asia/Jakarta')::date) DESC,finalized_at DESC NULLS LAST,version_number DESC,id DESC LIMIT 1`, monitoring.VersionGroupID, monitoring.ObservedAt).Scan(&expectedSourceID); err != nil {
		return nil, domainerrors.ErrMonitoringBeforeRiskEffective
	}
	if expectedSourceID != source.ID {
		return nil, domainerrors.ErrSourceRiskNoLongerActive
	}
	activate := monitoring.ObservedAt >= activeEffective.Format("2006-01-02")
	if monitoring.TransactionKind == "revision" && (source.ID != activeID || !activate) {
		return nil, domainerrors.ErrSourceRiskNoLongerActive
	}
	if resultRisk != nil {
		resultRisk.EffectiveFrom = &observed
		if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version_number),0)+1 FROM risks WHERE version_group_id=$1`, monitoring.VersionGroupID).Scan(&resultRisk.VersionNumber); err != nil {
			return nil, err
		}
	}

	if resultRisk != nil {
		if activate {
			_, err = tx.Exec(ctx, `
			UPDATE risks
			SET is_current = FALSE,
			    is_cycle_current = FALSE,
			    updated_at = now()
			WHERE version_group_id = $1
			  AND is_current = TRUE
		`, source.VersionGroupID)
			if err != nil {
				return nil, fmt.Errorf("deactivate current risk versions: %w", err)
			}
		}

		resultRisk.VersionGroupID = source.VersionGroupID
		resultRisk.PreviousRiskID = &source.ID
		resultRisk.OrganizationID = source.OrganizationID
		if resultRisk.CreatedBy == nil && finalizedBy != uuid.Nil {
			resultRisk.CreatedBy = &finalizedBy
		}
		resultRisk.IsCurrent = activate
		resultRisk.IsCycleCurrent = activate
		resultRisk.Status = entity.RiskStatusFinal
		resultRisk.ReviewType = "periodic"
		startedAt := monitoring.StartedAt.UTC().Round(time.Second)
		resultRisk.ReviewStartedAt = &startedAt
		resultRisk.FinalizedAt = &now
		resultRisk.ReviewSubmittedAt = &now
		resultRisk.ReviewApprovedAt = &now
		if err := insertRiskWithQueryer(ctx, tx, resultRisk); err != nil {
			return nil, err
		}
		var actor any
		if finalizedBy != uuid.Nil {
			actor = finalizedBy
		}
		if _, err := tx.Exec(ctx, `
			UPDATE risks
			SET finalized_by = $2,
			    finalized_at = $3::timestamptz,
			    effective_from = $4::date,
			    updated_at = now()
			WHERE id = $1
		`, resultRisk.ID, actor, now, monitoring.ObservedAt); err != nil {
			return nil, fmt.Errorf("record monitoring result risk finalization: %w", err)
		}
	}

	var resultRiskID *uuid.UUID
	if monitoring.TransactionKind == "monitoring" {
		resultRiskID = &source.ID
	}
	if resultRisk != nil {
		resultRiskID = &resultRisk.ID
	}
	tag, err := tx.Exec(ctx, `
		UPDATE risk_monitorings
		SET status = 'final',
		    result_risk_id = $2,
		    finalized_by = $3,
		    finalized_at = $4,
		    updated_at = now()
		WHERE id = $1 AND status = 'draft'
	`, monitoringID, resultRiskID, finalizedBy, now)
	if err != nil {
		return nil, fmt.Errorf("mark monitoring finalized: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domainerrors.ErrMonitoringAlreadyFinalized
	}
	if _, err := tx.Exec(ctx, `
		UPDATE risk_monitoring_periods
		SET status = 'completed', completed_monitoring_id = $3, completed_at = $4, updated_at = now()
		WHERE version_group_id = $1 AND period_label = $2
	`, source.VersionGroupID, monitoring.AssessmentCycle, monitoringID, now); err != nil {
		return nil, fmt.Errorf("mark monitoring period completed: %w", err)
	}

	if monitoring.TransactionKind == "monitoring" {
		evidence, err := readMonitoringEvidence(ctx, tx, source.ID, monitoringID, monitoring.AssessmentCycle, now)
		if err != nil {
			return nil, err
		}
		completion := 0
		if len(evidence.Reports) > 0 {
			reported := 0
			for _, report := range evidence.Reports {
				if (report.Status == "done" || report.Status == "pending" || report.Status == "skipped") && report.ReportedAt != nil && len([]rune(strings.TrimSpace(report.Notes))) >= 10 {
					reported++
				}
			}
			completion = int(math.Round(float64(reported) * 100 / float64(len(evidence.Reports))))
		}
		if _, err := tx.Exec(ctx, `UPDATE risk_monitorings SET evidence_snapshot=$2,mitigation_completion_percent=$3 WHERE id=$1`, monitoringID, evidence, completion); err != nil {
			return nil, fmt.Errorf("save monitoring evidence: %w", err)
		}

	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit monitoring finalization: %w", err)
	}

	return r.GetByID(ctx, monitoringID, nil)
}

func baseRiskMonitoringSelect() string {
	return `
		SELECT
			rm.id, rm.source_risk_id, rm.version_group_id, rm.result_risk_id, rm.assessment_cycle, rm.status, rm.superseded_by_monitoring_id, rm.mode,rm.transaction_kind,
			rm.source_probability, rm.source_impact, rm.source_weight, rm.source_nilai, rm.source_level, rm.source_version_number,
			rm.observed_probability, rm.observed_impact, rm.observed_weight, rm.observed_nilai, rm.observed_level,
			rm.conclusion,
			rm.mitigation_progress_summary,
			CASE
				WHEN rm.status='draft' AND mitigation_progress.total_tasks > 0
					THEN ROUND(mitigation_progress.reported_tasks * 100.0 / mitigation_progress.total_tasks)::int
				ELSE rm.mitigation_completion_percent
			END AS mitigation_completion_percent,
            CASE
              WHEN rm.status <> 'draft' AND jsonb_typeof(rm.evidence_snapshot->'reports')='array'
                THEN jsonb_array_length(rm.evidence_snapshot->'reports')
              WHEN rm.status='draft' OR mitigation_progress.total_tasks > 0
                THEN COALESCE(mitigation_progress.total_tasks,0)::int
              ELSE NULL
            END AS mitigation_task_count,
			rm.draft_payload, rm.profile_change_summary, rm.change_reason,
			rm.started_by, rm.started_at, rm.finalized_by, rm.finalized_at,
			rm.created_at, rm.updated_at, rm.observed_at::text, rm.observed_at_inferred,rm.profile_version_id,rm.monitoring_period_id,
			src.id, src.code, src.title, src.description, src.category, src.status, src.version_group_id, src.previous_risk_id,
			src.is_current, src.is_cycle_current, src.version_number, src.archived_at, src.archived_reason, src.organization_id,
			src.created_by, src.objective_id, src.ro_id, src.likelihood_assessment_id, src.impact_criteria_id, COALESCE(src.impact_justification, ''),
			src.cause, src.risk_source, src.controllability, src.impact_description,
				src.existing_control, src.control_effectiveness, src.probability, src.impact, src.weight, src.nilai, ROUND(COALESCE(src.nilai, 0))::int,
			src.risk_priority, src.risk_appetite, src.treatment_option,
				src.target_probability, src.target_impact, src.target_weight, src.target_nilai, ROUND(COALESCE(src.target_nilai, 0))::int, src.residual_acceptance_reason,
			src.next_review_date::text, COALESCE(src.review_schedule_text, ''), COALESCE(src.assessment_cycle, ''), COALESCE(src.review_type, ''),
			COALESCE(src.change_reason, ''), COALESCE(src.review_summary, ''), src.review_started_at, src.review_submitted_at, src.review_approved_at,
			src.created_at, src.updated_at, COALESCE(src_org.name, ''), COALESCE(src_user.name, ''),
			res.id, COALESCE(res.code, ''), COALESCE(res.title, ''), COALESCE(res.description, ''), COALESCE(res.category, ''), COALESCE(res.status, ''), COALESCE(res.version_group_id, '00000000-0000-0000-0000-000000000000'::uuid), res.previous_risk_id,
			COALESCE(res.is_current, FALSE), COALESCE(res.is_cycle_current, FALSE), COALESCE(res.version_number, 0), res.archived_at, COALESCE(res.archived_reason, ''), res.organization_id,
			res.created_by, res.objective_id, res.ro_id, res.likelihood_assessment_id, res.impact_criteria_id, COALESCE(res.impact_justification, ''),
			COALESCE(res.cause, '{}'::text[]), COALESCE(res.risk_source, ''), COALESCE(res.controllability, ''), COALESCE(res.impact_description, '{}'::text[]),
				COALESCE(res.existing_control, ''), COALESCE(res.control_effectiveness, ''), COALESCE(res.probability, 0), COALESCE(res.impact, 0), COALESCE(res.weight, 0), COALESCE(res.nilai, 0), ROUND(COALESCE(res.nilai, 0))::int,
			COALESCE(res.risk_priority, 0), COALESCE(res.risk_appetite, ''), COALESCE(res.treatment_option, ''),
				COALESCE(res.target_probability, 0), COALESCE(res.target_impact, 0), COALESCE(res.target_weight, 0), COALESCE(res.target_nilai, 0), ROUND(COALESCE(res.target_nilai, 0))::int, COALESCE(res.residual_acceptance_reason, ''),
			COALESCE(res.next_review_date::text, ''), COALESCE(res.review_schedule_text, ''), COALESCE(res.assessment_cycle, ''), COALESCE(res.review_type, ''),
			COALESCE(res.change_reason, ''), COALESCE(res.review_summary, ''), res.review_started_at, res.review_submitted_at, res.review_approved_at,
			COALESCE(res.created_at, now()), COALESCE(res.updated_at, now()), COALESCE(res_org.name, ''), COALESCE(res_user.name, '')
		FROM risk_monitorings rm
		LEFT JOIN risks src ON src.id = rm.source_risk_id
		LEFT JOIN organizations src_org ON src_org.id = src.organization_id
		LEFT JOIN users src_user ON src_user.id = src.created_by
		LEFT JOIN risks res ON res.id = rm.result_risk_id
		LEFT JOIN organizations res_org ON res_org.id = res.organization_id
		LEFT JOIN users res_user ON res_user.id = res.created_by
		LEFT JOIN (
			SELECT
				monitoring_id,
				COUNT(*) AS total_tasks,
				COUNT(*) FILTER (
					WHERE status IN ('done','pending','skipped')
					  AND reported_at IS NOT NULL
					  AND length(BTRIM(COALESCE(notes, ''))) >= 10
				) AS reported_tasks
			FROM mitigation_tasks
			WHERE monitoring_id IS NOT NULL
			GROUP BY monitoring_id
		) AS mitigation_progress ON mitigation_progress.monitoring_id = rm.id
	`
}

func scanRiskMonitoring(row pgx.Row) (*entity.RiskMonitoring, error) {
	monitoring := &entity.RiskMonitoring{}
	var profileChangesRaw []byte
	var draftPayloadRaw []byte
	var sourceRisk entity.Risk
	var sourceOrgName string
	var sourceCreatedByName string
	var sourceROID uuid.NullUUID
	var sourceCreatedBy uuid.NullUUID
	var sourceResultRisk entity.Risk
	var resultOrgName string
	var resultCreatedByName string
	var resultROID uuid.NullUUID
	var resultCreatedBy uuid.NullUUID
	var resultID uuid.NullUUID

	if err := row.Scan(
		&monitoring.ID, &monitoring.SourceRiskID, &monitoring.VersionGroupID, &monitoring.ResultRiskID, &monitoring.AssessmentCycle, &monitoring.Status, &monitoring.SupersededByMonitoringID, &monitoring.Mode, &monitoring.TransactionKind,
		&monitoring.SourceProbability, &monitoring.SourceImpact, &monitoring.SourceWeight, &monitoring.SourceNilai, &monitoring.SourceLevel, &monitoring.SourceVersionNumber,
		&monitoring.ObservedProbability, &monitoring.ObservedImpact, &monitoring.ObservedWeight, &monitoring.ObservedNilai, &monitoring.ObservedLevel,
		&monitoring.Conclusion,
		&monitoring.MitigationProgressSummary, &monitoring.MitigationCompletionPercent, &monitoring.MitigationTaskCount,
		&draftPayloadRaw, &profileChangesRaw, &monitoring.ChangeReason,
		&monitoring.StartedBy, &monitoring.StartedAt, &monitoring.FinalizedBy, &monitoring.FinalizedAt,
		&monitoring.CreatedAt, &monitoring.UpdatedAt, &monitoring.ObservedAt, &monitoring.ObservedAtInferred, &monitoring.ProfileVersionID, &monitoring.MonitoringPeriodID,
		&sourceRisk.ID, &sourceRisk.Code, &sourceRisk.Title, &sourceRisk.Description, &sourceRisk.Category, &sourceRisk.Status, &sourceRisk.VersionGroupID, &sourceRisk.PreviousRiskID,
		&sourceRisk.IsCurrent, &sourceRisk.IsCycleCurrent, &sourceRisk.VersionNumber, &sourceRisk.ArchivedAt, &sourceRisk.ArchivedReason, &sourceRisk.OrganizationID,
		&sourceCreatedBy, &sourceRisk.ObjectiveID, &sourceROID, &sourceRisk.LikelihoodAssessmentID, &sourceRisk.ImpactCriteriaID, &sourceRisk.ImpactJustification,
		&sourceRisk.Cause, &sourceRisk.RiskSource, &sourceRisk.Controllability, &sourceRisk.ImpactDesc,
		&sourceRisk.ExistingControl, &sourceRisk.ControlEffectiveness, &sourceRisk.Probability, &sourceRisk.Impact, &sourceRisk.Weight, &sourceRisk.Nilai, &sourceRisk.InherentScore,
		&sourceRisk.RiskPriority, &sourceRisk.RiskAppetite, &sourceRisk.TreatmentOption,
		&sourceRisk.TargetProbability, &sourceRisk.TargetImpact, &sourceRisk.TargetWeight, &sourceRisk.TargetNilai, &sourceRisk.TargetScore, &sourceRisk.ResidualAcceptanceReason,
		&sourceRisk.NextReviewDate, &sourceRisk.ReviewScheduleText, &sourceRisk.AssessmentCycle, &sourceRisk.ReviewType,
		&sourceRisk.ChangeReason, &sourceRisk.ReviewSummary, &sourceRisk.ReviewStartedAt, &sourceRisk.ReviewSubmittedAt, &sourceRisk.ReviewApprovedAt,
		&sourceRisk.CreatedAt, &sourceRisk.UpdatedAt, &sourceOrgName, &sourceCreatedByName,
		&resultID, &sourceResultRisk.Code, &sourceResultRisk.Title, &sourceResultRisk.Description, &sourceResultRisk.Category, &sourceResultRisk.Status, &sourceResultRisk.VersionGroupID, &sourceResultRisk.PreviousRiskID,
		&sourceResultRisk.IsCurrent, &sourceResultRisk.IsCycleCurrent, &sourceResultRisk.VersionNumber, &sourceResultRisk.ArchivedAt, &sourceResultRisk.ArchivedReason, &sourceResultRisk.OrganizationID,
		&resultCreatedBy, &sourceResultRisk.ObjectiveID, &resultROID, &sourceResultRisk.LikelihoodAssessmentID, &sourceResultRisk.ImpactCriteriaID, &sourceResultRisk.ImpactJustification,
		&sourceResultRisk.Cause, &sourceResultRisk.RiskSource, &sourceResultRisk.Controllability, &sourceResultRisk.ImpactDesc,
		&sourceResultRisk.ExistingControl, &sourceResultRisk.ControlEffectiveness, &sourceResultRisk.Probability, &sourceResultRisk.Impact, &sourceResultRisk.Weight, &sourceResultRisk.Nilai, &sourceResultRisk.InherentScore,
		&sourceResultRisk.RiskPriority, &sourceResultRisk.RiskAppetite, &sourceResultRisk.TreatmentOption,
		&sourceResultRisk.TargetProbability, &sourceResultRisk.TargetImpact, &sourceResultRisk.TargetWeight, &sourceResultRisk.TargetNilai, &sourceResultRisk.TargetScore, &sourceResultRisk.ResidualAcceptanceReason,
		&sourceResultRisk.NextReviewDate, &sourceResultRisk.ReviewScheduleText, &sourceResultRisk.AssessmentCycle, &sourceResultRisk.ReviewType,
		&sourceResultRisk.ChangeReason, &sourceResultRisk.ReviewSummary, &sourceResultRisk.ReviewStartedAt, &sourceResultRisk.ReviewSubmittedAt, &sourceResultRisk.ReviewApprovedAt,
		&sourceResultRisk.CreatedAt, &sourceResultRisk.UpdatedAt, &resultOrgName, &resultCreatedByName,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("scan risk monitoring: %w", err)
	}

	if len(profileChangesRaw) > 0 {
		if err := json.Unmarshal(profileChangesRaw, &monitoring.ProfileChangeSummary); err != nil {
			return nil, fmt.Errorf("unmarshal profile changes: %w", err)
		}
	}
	if len(draftPayloadRaw) > 0 {
		var payload entity.RiskMonitoringDraftPayload
		if err := json.Unmarshal(draftPayloadRaw, &payload); err != nil {
			return nil, fmt.Errorf("unmarshal draft payload: %w", err)
		}
		monitoring.SetDraftPayload(&payload)
	}
	sourceRisk.ROID = nullableUUIDPtr(sourceROID)
	if sourceCreatedBy.Valid {
		sourceRisk.CreatedBy = &sourceCreatedBy.UUID
	}
	sourceRisk.OrgName = sourceOrgName
	sourceRisk.CreatedByName = sourceCreatedByName
	monitoring.SourceRisk = &sourceRisk

	if resultID.Valid {
		sourceResultRisk.ROID = nullableUUIDPtr(resultROID)
		if resultCreatedBy.Valid {
			sourceResultRisk.CreatedBy = &resultCreatedBy.UUID
		}
		sourceResultRisk.OrgName = resultOrgName
		sourceResultRisk.CreatedByName = resultCreatedByName
		monitoring.ResultRisk = &sourceResultRisk
	}

	return monitoring, nil
}

func getRiskByIDWithQueryer(ctx context.Context, q riskMonitoringQueryer, id uuid.UUID) (*entity.Risk, error) {
	risk := &entity.Risk{}
	var draftApprovalLineRaw []byte
	var roID uuid.NullUUID
	query := `
		SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.ro_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
		       r.cause, r.risk_source, r.controllability, r.impact_description,
		       r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, ROUND(COALESCE(r.nilai, 0))::int,
		       r.risk_priority, r.risk_appetite, r.treatment_option,
		       r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
		       r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
		       r.review_started_at, r.review_submitted_at, r.review_approved_at,
		       COALESCE(r.draft_approval_line, '[]'::jsonb),
		       r.created_at, r.updated_at,
		       COALESCE(o.name, '') as org_name,
		       COALESCE(u.name, '') as created_by_name,
		       draft.id as draft_id,
		       draft.status as draft_status,
		       CASE WHEN draft.id IS NOT NULL THEN true ELSE false END as has_ongoing
		FROM risks r
		LEFT JOIN organizations o ON r.organization_id = o.id
		LEFT JOIN users u ON r.created_by = u.id
		LEFT JOIN LATERAL (
			SELECT d.id, d.status
			FROM risks d
			WHERE d.code = r.code
			  AND d.status = 'draft'
			  AND d.created_at > r.created_at
			  AND d.archived_at IS NULL
			ORDER BY d.created_at DESC
			LIMIT 1
		) draft ON true
		WHERE r.id = $1`
	if err := q.QueryRow(ctx, query, id).Scan(
		&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &roID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
		&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
		&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
		&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
		&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
		&risk.ResidualAcceptanceReason,
		&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
		&draftApprovalLineRaw,
		&risk.CreatedAt, &risk.UpdatedAt,
		&risk.OrgName, &risk.CreatedByName,
		&risk.DraftID, &risk.DraftStatus, &risk.HasOngoing,
	); err != nil {
		return nil, err
	}
	risk.ROID = nullableUUIDPtr(roID)
	if len(draftApprovalLineRaw) > 0 {
		if err := json.Unmarshal(draftApprovalLineRaw, &risk.DraftApprovalLine); err != nil {
			return nil, fmt.Errorf("unmarshal draft approval line: %w", err)
		}
	}
	return risk, nil
}

func containsUUID(values []uuid.UUID, target *uuid.UUID) bool {
	if target == nil {
		return true
	}
	for _, value := range values {
		if value == *target {
			return true
		}
	}
	return false
}

// UpdateTaskMonitoringIDs links pending mitigation_tasks for a given risk+cycle
func (r *riskMonitoringRepository) UpdateTaskMonitoringIDs(ctx context.Context, monitoringID uuid.UUID, riskID uuid.UUID, cycle string) error {
	_, err := r.pool.Exec(ctx,
		`WITH draft AS (
		   SELECT id FROM risk_monitorings WHERE id = $1 AND status = 'draft' FOR UPDATE
		 )
		 UPDATE mitigation_tasks
		 SET monitoring_id = $1, updated_at = NOW()
		 WHERE risk_id = $2 AND monitoring_id IS NULL AND $3::text IS NOT NULL AND EXISTS (SELECT 1 FROM draft)`,
		monitoringID, riskID, cycle,
	)
	return err
}
