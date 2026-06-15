package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type riskMonitoringRepository struct {
	pool *pgxpool.Pool
}

func NewRiskMonitoringRepository(pool *pgxpool.Pool) repository.RiskMonitoringRepository {
	return &riskMonitoringRepository{pool: pool}
}

type riskMonitoringQueryer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func (r *riskMonitoringRepository) Create(ctx context.Context, monitoring *entity.RiskMonitoring) error {
	if err := monitoring.Validate(); err != nil {
		return err
	}
	monitoring.NormalizeNilaiForStorage()
	profileChanges, err := json.Marshal(monitoring.ProfileChangeSummary)
	if err != nil {
		return fmt.Errorf("marshal profile changes: %w", err)
	}
	draftPayload := mustJSON(monitoring.DraftPayloadSnapshot())
	err = r.pool.QueryRow(ctx, `
		INSERT INTO risk_monitorings (
			source_risk_id, result_risk_id, assessment_cycle, status, mode,
			source_probability, source_impact, source_weight, source_nilai, source_level, source_version_number,
			observed_probability, observed_impact, observed_weight, observed_nilai, observed_level,
			condition_summary, event_summary, trend, effectiveness_conclusion, follow_up_note, conclusion,
			mitigation_progress_summary, mitigation_completion_percent, mitigation_obstacles, mitigation_follow_up,
			draft_payload,
			profile_change_summary, change_reason, started_by, started_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
		RETURNING id, started_at, created_at, updated_at`,
		monitoring.SourceRiskID,
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
		monitoring.ConditionSummary,
		monitoring.EventSummary,
		monitoring.Trend,
		monitoring.EffectivenessConclusion,
		monitoring.FollowUpNote,
		monitoring.Conclusion,
		monitoring.MitigationProgressSummary,
		monitoring.MitigationCompletionPercent,
		monitoring.MitigationObstacles,
		monitoring.MitigationFollowUp,
		draftPayload,
		profileChanges,
		monitoring.ChangeReason,
		monitoring.StartedBy,
		monitoring.StartedAt,
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
		WHERE rm.source_risk_id = $1 AND rm.assessment_cycle = $2 AND rm.status = 'draft'
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
			  AND status = 'finalized'
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
		ORDER BY rm.created_at DESC
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

func (r *riskMonitoringRepository) List(ctx context.Context, filter repository.RiskMonitoringListFilter) ([]*entity.RiskMonitoring, int, error) {
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
		WHERE 1=1`
	dataQuery := baseRiskMonitoringSelect() + `
		WHERE 1=1`

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
		clause := fmt.Sprintf(" AND rm.started_at::date = $%d::date", argIdx)
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
			COALESCE(rm.condition_summary, '') ILIKE $%d OR
			COALESCE(rm.event_summary, '') ILIKE $%d
		)`, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, "%"+filter.Query+"%")
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list risk monitoring count: %w", err)
	}

	orderDir := "DESC"
	if filter.SortOrder == "asc" {
		orderDir = "ASC"
	}
	switch filter.SortBy {
	case "assessment_cycle":
		dataQuery += fmt.Sprintf(" ORDER BY rm.assessment_cycle %s, rm.started_at DESC, rm.id DESC", orderDir)
	case "status":
		dataQuery += fmt.Sprintf(" ORDER BY rm.status %s, rm.started_at DESC, rm.id DESC", orderDir)
	case "started_at", "":
		fallthrough
	default:
		dataQuery += fmt.Sprintf(" ORDER BY rm.started_at %s, rm.id DESC", orderDir)
	}
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
	tag, err := r.pool.Exec(ctx, `
		UPDATE risk_monitorings
		SET mode = $2,
		    observed_probability = $3,
		    observed_impact = $4,
		    observed_weight = $5,
		    observed_nilai = $6,
		    observed_level = $7,
		    condition_summary = $8,
		    event_summary = $9,
		    trend = $10,
		    effectiveness_conclusion = $11,
		    follow_up_note = $12,
		    conclusion = $13,
		    mitigation_progress_summary = $14,
		    mitigation_completion_percent = $15,
		    mitigation_obstacles = $16,
		    mitigation_follow_up = $17,
		    draft_payload = $18,
		    profile_change_summary = $19,
		    change_reason = $20,
		    updated_at = now()
		WHERE id = $1 AND status = 'draft'
	`,
		monitoring.ID,
		monitoring.Mode,
		monitoring.ObservedProbability,
		monitoring.ObservedImpact,
		monitoring.ObservedWeight,
		monitoring.ObservedNilai,
		monitoring.ObservedLevel,
		monitoring.ConditionSummary,
		monitoring.EventSummary,
		monitoring.Trend,
		monitoring.EffectivenessConclusion,
		monitoring.FollowUpNote,
		monitoring.Conclusion,
		monitoring.MitigationProgressSummary,
		monitoring.MitigationCompletionPercent,
		monitoring.MitigationObstacles,
		monitoring.MitigationFollowUp,
		draftPayload,
		profileChanges,
		monitoring.ChangeReason,
	)
	if err != nil {
		return fmt.Errorf("update monitoring draft: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *riskMonitoringRepository) Finalize(ctx context.Context, monitoringID uuid.UUID, resultRisk *entity.Risk, finalizedBy uuid.UUID) (*entity.RiskMonitoring, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin monitoring finalization: %w", err)
	}
	defer tx.Rollback(ctx)

	monitoring, err := scanRiskMonitoring(tx.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.id = $1 FOR UPDATE OF rm`, monitoringID))
	if err != nil {
		return nil, err
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, fmt.Errorf("monitoring is not draft")
	}

	source, err := getRiskByIDWithQueryer(ctx, tx, monitoring.SourceRiskID)
	if err != nil {
		return nil, err
	}
	if !source.IsApprovedCurrent() {
		return nil, fmt.Errorf("source risk is no longer active")
	}

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

	resultRisk.VersionGroupID = source.VersionGroupID
	resultRisk.PreviousRiskID = &source.ID
	resultRisk.OrganizationID = source.OrganizationID
	if resultRisk.CreatedBy == nil && finalizedBy != uuid.Nil {
		resultRisk.CreatedBy = &finalizedBy
	}
	resultRisk.IsCurrent = true
	resultRisk.IsCycleCurrent = true
	resultRisk.Status = entity.RiskStatusApproved
	resultRisk.AssessmentCycle = monitoring.AssessmentCycle
	resultRisk.ReviewType = "periodic"
	startedAt := monitoring.StartedAt.UTC().Round(time.Second)
	resultRisk.ReviewStartedAt = &startedAt
	if monitoring.FinalizedAt != nil {
		resultRisk.ReviewSubmittedAt = monitoring.FinalizedAt
		resultRisk.ReviewApprovedAt = monitoring.FinalizedAt
	}
	if err := insertRiskWithQueryer(ctx, tx, resultRisk); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	tag, err := tx.Exec(ctx, `
		UPDATE risk_monitorings
		SET status = 'finalized',
		    result_risk_id = $2,
		    finalized_by = $3,
		    finalized_at = $4,
		    updated_at = now()
		WHERE id = $1 AND status = 'draft'
	`, monitoringID, resultRisk.ID, finalizedBy, now)
	if err != nil {
		return nil, fmt.Errorf("mark monitoring finalized: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("monitoring was already finalized")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit monitoring finalization: %w", err)
	}

	return r.GetByID(ctx, monitoringID, nil)
}

func baseRiskMonitoringSelect() string {
	return `
		SELECT
			rm.id, rm.source_risk_id, rm.result_risk_id, rm.assessment_cycle, rm.status, rm.mode,
			rm.source_probability, rm.source_impact, rm.source_weight, rm.source_nilai, rm.source_level, rm.source_version_number,
			rm.observed_probability, rm.observed_impact, rm.observed_weight, rm.observed_nilai, rm.observed_level,
			rm.condition_summary, rm.event_summary, rm.trend, rm.effectiveness_conclusion, rm.follow_up_note, rm.conclusion,
			rm.mitigation_progress_summary, rm.mitigation_completion_percent, rm.mitigation_obstacles, rm.mitigation_follow_up,
			rm.draft_payload, rm.profile_change_summary, rm.change_reason,
			rm.started_by, rm.started_at, rm.finalized_by, rm.finalized_at, rm.voided_by, rm.voided_at, rm.void_reason,
			rm.created_at, rm.updated_at,
			src.id, src.code, src.title, src.description, src.category, src.status, src.version_group_id, src.previous_risk_id,
			src.is_current, src.is_cycle_current, src.version_number, src.archived_at, src.archived_reason, src.organization_id,
			src.created_by, src.objective_id, src.ro_id, src.likelihood_assessment_id, src.impact_criteria_id, COALESCE(src.impact_justification, ''),
			src.cause, src.risk_source, src.controllability, src.impact_description,
			src.existing_control, src.control_effectiveness, src.probability, src.impact, src.weight, src.nilai, src.inherent_score,
			src.risk_priority, src.risk_appetite, src.treatment_option,
			src.target_probability, src.target_impact, src.target_weight, src.target_nilai, src.target_score, src.residual_acceptance_reason,
			src.next_review_date::text, COALESCE(src.review_schedule_text, ''), COALESCE(src.assessment_cycle, ''), COALESCE(src.review_type, ''),
			COALESCE(src.change_reason, ''), COALESCE(src.review_summary, ''), src.review_started_at, src.review_submitted_at, src.review_approved_at,
			src.created_at, src.updated_at, COALESCE(src_org.name, ''), COALESCE(src_user.name, ''),
			res.id, COALESCE(res.code, ''), COALESCE(res.title, ''), COALESCE(res.description, ''), COALESCE(res.category, ''), COALESCE(res.status, ''), COALESCE(res.version_group_id, '00000000-0000-0000-0000-000000000000'::uuid), res.previous_risk_id,
			COALESCE(res.is_current, FALSE), COALESCE(res.is_cycle_current, FALSE), COALESCE(res.version_number, 0), res.archived_at, COALESCE(res.archived_reason, ''), res.organization_id,
			res.created_by, res.objective_id, res.ro_id, res.likelihood_assessment_id, res.impact_criteria_id, COALESCE(res.impact_justification, ''),
			COALESCE(res.cause, '{}'::text[]), COALESCE(res.risk_source, ''), COALESCE(res.controllability, ''), COALESCE(res.impact_description, '{}'::text[]),
			COALESCE(res.existing_control, ''), COALESCE(res.control_effectiveness, ''), COALESCE(res.probability, 0), COALESCE(res.impact, 0), COALESCE(res.weight, 0), COALESCE(res.nilai, 0), COALESCE(res.inherent_score, 0),
			COALESCE(res.risk_priority, 0), COALESCE(res.risk_appetite, ''), COALESCE(res.treatment_option, ''),
			COALESCE(res.target_probability, 0), COALESCE(res.target_impact, 0), COALESCE(res.target_weight, 0), COALESCE(res.target_nilai, 0), COALESCE(res.target_score, 0), COALESCE(res.residual_acceptance_reason, ''),
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
		&monitoring.ID, &monitoring.SourceRiskID, &monitoring.ResultRiskID, &monitoring.AssessmentCycle, &monitoring.Status, &monitoring.Mode,
		&monitoring.SourceProbability, &monitoring.SourceImpact, &monitoring.SourceWeight, &monitoring.SourceNilai, &monitoring.SourceLevel, &monitoring.SourceVersionNumber,
		&monitoring.ObservedProbability, &monitoring.ObservedImpact, &monitoring.ObservedWeight, &monitoring.ObservedNilai, &monitoring.ObservedLevel,
		&monitoring.ConditionSummary, &monitoring.EventSummary, &monitoring.Trend, &monitoring.EffectivenessConclusion, &monitoring.FollowUpNote, &monitoring.Conclusion,
		&monitoring.MitigationProgressSummary, &monitoring.MitigationCompletionPercent, &monitoring.MitigationObstacles, &monitoring.MitigationFollowUp,
		&draftPayloadRaw, &profileChangesRaw, &monitoring.ChangeReason,
		&monitoring.StartedBy, &monitoring.StartedAt, &monitoring.FinalizedBy, &monitoring.FinalizedAt, &monitoring.VoidedBy, &monitoring.VoidedAt, &monitoring.VoidReason,
		&monitoring.CreatedAt, &monitoring.UpdatedAt,
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
		       r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, r.inherent_score,
		       r.risk_priority, r.risk_appetite, r.treatment_option,
		       r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score, r.residual_acceptance_reason,
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
			  AND d.status IN ('assessment_draft', 'assessment_in_review')
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
		`UPDATE mitigation_tasks
		 SET monitoring_id = $1, updated_at = NOW()
		 WHERE risk_id = $2 AND period_label = $3 AND monitoring_id IS NULL`,
		monitoringID, riskID, cycle,
	)
	return err
}
