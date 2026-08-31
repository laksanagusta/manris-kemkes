package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"golang.org/x/sync/errgroup"
)

// riskRepository is the PostgreSQL implementation of repository.RiskRepository
type riskRepository struct {
	pool *pgxpool.Pool
}

type riskQueryer interface {
	Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// NewRiskRepository creates a new risk repository
func NewRiskRepository(pool *pgxpool.Pool) repository.RiskRepository {
	return &riskRepository{pool: pool}
}

// uuidArrayToStrings converts []uuid.UUID to []string for pgx ANY($N::uuid[]) queries
func uuidArrayToStrings(ids []uuid.UUID) []string {
	strs := make([]string, len(ids))
	for i, id := range ids {
		strs[i] = id.String()
	}
	return strs
}

func nullableUUIDPtr(value uuid.NullUUID) *uuid.UUID {
	if !value.Valid {
		return nil
	}
	uuidValue := value.UUID
	return &uuidValue
}

func nullableDateString(value *string) any {
	if value == nil {
		return nil
	}
	normalized := strings.TrimSpace(*value)
	if normalized == "" {
		return nil
	}
	return normalized
}

// Create inserts a new risk and its mitigations
func (r *riskRepository) Create(ctx context.Context, risk *entity.Risk) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin create risk: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := insertRiskWithQueryer(ctx, tx, risk); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit create risk: %w", err)
	}
	return nil
}

func insertRiskWithQueryer(ctx context.Context, q riskQueryer, risk *entity.Risk) error {
	risk.CalculateAll()
	risk.CalculateTargetBobot()
	risk.CalculateTargetNilai()
	risk.CalculateTargetScore()

	err := q.QueryRow(ctx,
		`INSERT INTO risks (code, title, description, category, status, version_group_id, previous_risk_id, is_current, is_cycle_current, version_number, archived_at, archived_reason, organization_id, created_by,
		  cause, risk_source, controllability, impact_description,
		  existing_control, control_effectiveness, probability, impact, weight, nilai,
		  risk_priority, risk_appetite, treatment_option,
		  target_probability, target_impact, target_weight, target_nilai, next_review_date, review_schedule_text, assessment_cycle, review_type, change_reason, review_summary, review_started_at, review_submitted_at, review_approved_at, draft_approval_line,
		  objective_id, ro_id, impact_criteria_id, impact_justification, residual_acceptance_reason, finalized_by, finalized_at, effective_from)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49)
		 RETURNING id, created_at, updated_at`,
		risk.Code, risk.Title, risk.Description, risk.Category, risk.Status, risk.VersionGroupID, risk.PreviousRiskID, risk.IsCurrent, risk.IsCycleCurrent, risk.VersionNumber, risk.ArchivedAt, risk.ArchivedReason, risk.OrganizationID, risk.CreatedBy,
		risk.Cause, risk.RiskSource, risk.Controllability, risk.ImpactDesc,
		risk.ExistingControl, risk.ControlEffectiveness, risk.Probability, risk.Impact, risk.Weight, risk.Nilai,
		risk.RiskPriority, risk.RiskAppetite, risk.TreatmentOption,
		risk.TargetProbability, risk.TargetImpact, risk.TargetWeight, risk.TargetNilai, risk.NextReviewDate, risk.ReviewScheduleText,
		risk.AssessmentCycle, risk.ReviewType, risk.ChangeReason, risk.ReviewSummary, risk.ReviewStartedAt, risk.ReviewSubmittedAt, risk.ReviewApprovedAt, mustJSON(risk.DraftApprovalLine),
		risk.ObjectiveID, risk.ROID, risk.ImpactCriteriaID, risk.ImpactJustification, risk.ResidualAcceptanceReason, risk.FinalizedBy, risk.FinalizedAt, risk.EffectiveFrom,
	).Scan(&risk.ID, &risk.CreatedAt, &risk.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create risk: %w", err)
	}

	for i, m := range risk.Mitigations {
		frequency := normalizeMitigationFrequency(m.Frequency)
		mitigationType := entity.NormalizeMitigationType(m.MitigationType)
		_, err := q.Exec(ctx,
			`INSERT INTO mitigations (
				risk_id, action, owner, owner_user_id, due_date, frequency, recurring_interval, report_day, report_date, execution_schedule_text, target_cost, sort_order,
				mitigation_type, activity_stage, expected_output, quantitative_target, supporting_unit, resources_required, contingency_plan, potential_obstacle, is_breakthrough_activity, is_existing_control
			)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
			risk.ID, m.Action, m.Owner, m.OwnerUserID, nullableDateString(m.DueDate), frequency, m.RecurringInterval, m.ReportDay, m.ReportDate, m.ExecutionScheduleText, m.TargetCost, i+1,
			mitigationType, m.ActivityStage, m.ExpectedOutput, m.QuantitativeTarget, m.SupportingUnit, m.ResourcesRequired, m.ContingencyPlan, m.PotentialObstacle, m.IsBreakthroughActivity, m.IsExistingControl)
		if err != nil {
			return fmt.Errorf("create mitigation: %w", err)
		}
	}
	return nil
}

func (r *riskRepository) GetOrCreatePeriodicReassessmentInTx(ctx context.Context, sourceRisk *entity.Risk, cycle string, createdBy uuid.UUID) (*entity.Risk, bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin reassessment reservation tx: %w", err)
	}
	defer tx.Rollback(ctx)

	lockedRows, err := tx.Query(ctx, `SELECT id FROM risks WHERE version_group_id = $1 FOR UPDATE`, sourceRisk.VersionGroupID)
	if err != nil {
		return nil, false, fmt.Errorf("lock risk version group: %w", err)
	}
	lockedRows.Close()

	existing, err := getInProgressReassessmentForCycle(ctx, tx, sourceRisk.VersionGroupID, cycle)
	if err != nil {
		return nil, false, err
	}
	if existing != nil {
		if err := tx.Commit(ctx); err != nil {
			return nil, false, fmt.Errorf("commit reassessment reservation tx: %w", err)
		}
		return existing, false, nil
	}

	draft := cloneRiskForPeriodicReassessment(sourceRisk, cycle, time.Now().UTC())
	if createdBy != uuid.Nil {
		draft.CreatedBy = &createdBy
	}
	if err := insertRiskWithQueryer(ctx, tx, draft); err != nil {
		return nil, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit reassessment reservation tx: %w", err)
	}
	return draft, true, nil
}

// GetByID retrieves a risk by ID including mitigations
func (r *riskRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	risk := &entity.Risk{}
	var draftApprovalLineRaw []byte
	var roID uuid.NullUUID

	query := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.ro_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
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
	args := []interface{}{id}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(orgIDs))
	}

	err := r.pool.QueryRow(ctx, query, args...).Scan(
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
	)
	if err != nil {
		return nil, fmt.Errorf("find risk by id: %w", err)
	}
	risk.ROID = nullableUUIDPtr(roID)
	if len(draftApprovalLineRaw) > 0 {
		if err := json.Unmarshal(draftApprovalLineRaw, &risk.DraftApprovalLine); err != nil {
			return nil, fmt.Errorf("unmarshal draft approval line: %w", err)
		}
	}

	// Load mitigations
	mRows, err := r.pool.Query(ctx,
		`SELECT id, risk_id, action, owner, owner_user_id, due_date::text, frequency, recurring_interval, report_day, report_date, COALESCE(execution_schedule_text, ''), target_cost, sort_order, created_at,
		        mitigation_type, activity_stage, expected_output, quantitative_target, supporting_unit, resources_required, contingency_plan, potential_obstacle, is_breakthrough_activity, is_existing_control
		 FROM mitigations WHERE risk_id = $1 ORDER BY sort_order`, id)
	if err != nil {
		return nil, fmt.Errorf("load mitigations: %w", err)
	}
	defer mRows.Close()

	for mRows.Next() {
		var m entity.Mitigation
		if err := mRows.Scan(&m.ID, &m.RiskID, &m.Action, &m.Owner, &m.OwnerUserID, &m.DueDate, &m.Frequency, &m.RecurringInterval, &m.ReportDay, &m.ReportDate, &m.ExecutionScheduleText, &m.TargetCost, &m.SortOrder, &m.CreatedAt,
			&m.MitigationType, &m.ActivityStage, &m.ExpectedOutput, &m.QuantitativeTarget, &m.SupportingUnit, &m.ResourcesRequired, &m.ContingencyPlan, &m.PotentialObstacle, &m.IsBreakthroughActivity, &m.IsExistingControl); err != nil {
			return nil, fmt.Errorf("scan mitigation: %w", err)
		}
		risk.Mitigations = append(risk.Mitigations, m)
	}

	return risk, nil
}

// Update updates an existing risk and replaces its mitigations
func (r *riskRepository) Update(ctx context.Context, risk *entity.Risk) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin update risk: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := updateRiskWithQueryer(ctx, tx, risk); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit update risk: %w", err)
	}
	return nil
}

func updateRiskWithQueryer(ctx context.Context, q riskQueryer, risk *entity.Risk) error {
	risk.CalculateAll()
	risk.CalculateTargetBobot()
	risk.CalculateTargetNilai()
	risk.CalculateTargetScore()

	_, err := q.Exec(ctx,
		`UPDATE risks SET code=$2, title=$3, description=$4, category=$5, status=$6, version_group_id=$7, previous_risk_id=$8, is_current=$9, is_cycle_current=$10, version_number=$11, archived_at=$12, archived_reason=$13, organization_id=$14,
		  ro_id=$15, cause=$16, risk_source=$17, controllability=$18, impact_description=$19,
		  existing_control=$20, control_effectiveness=$21, probability=$22, impact=$23, weight=$24, nilai=$25,
		  risk_priority=$26, risk_appetite=$27, treatment_option=$28,
		  target_probability=$29, target_impact=$30, target_weight=$31, target_nilai=$32, next_review_date=$33, review_schedule_text=$34,
		  assessment_cycle=$35, review_type=$36, change_reason=$37, review_summary=$38, review_started_at=$39, review_submitted_at=$40, review_approved_at=$41,
		  draft_approval_line=$42, impact_criteria_id=$43, impact_justification=$44, residual_acceptance_reason=$45,
		  updated_at=now()
		 WHERE id=$1`,
		risk.ID, risk.Code, risk.Title, risk.Description, risk.Category, risk.Status, risk.VersionGroupID, risk.PreviousRiskID, risk.IsCurrent, risk.IsCycleCurrent, risk.VersionNumber, risk.ArchivedAt, risk.ArchivedReason, risk.OrganizationID,
		risk.ROID, risk.Cause, risk.RiskSource, risk.Controllability, risk.ImpactDesc,
		risk.ExistingControl, risk.ControlEffectiveness, risk.Probability, risk.Impact, risk.Weight, risk.Nilai,
		risk.RiskPriority, risk.RiskAppetite, risk.TreatmentOption,
		risk.TargetProbability, risk.TargetImpact, risk.TargetWeight, risk.TargetNilai, risk.NextReviewDate, risk.ReviewScheduleText,
		risk.AssessmentCycle, risk.ReviewType, risk.ChangeReason, risk.ReviewSummary, risk.ReviewStartedAt, risk.ReviewSubmittedAt, risk.ReviewApprovedAt, mustJSON(risk.DraftApprovalLine),
		risk.ImpactCriteriaID, risk.ImpactJustification, risk.ResidualAcceptanceReason,
	)
	if err != nil {
		return fmt.Errorf("update risk: %w", err)
	}

	// Replace mitigations
	if _, err := q.Exec(ctx, "DELETE FROM mitigations WHERE risk_id = $1", risk.ID); err != nil {
		return fmt.Errorf("delete existing mitigations: %w", err)
	}
	for i, m := range risk.Mitigations {
		frequency := normalizeMitigationFrequency(m.Frequency)
		mitigationType := entity.NormalizeMitigationType(m.MitigationType)
		_, err := q.Exec(ctx,
			`INSERT INTO mitigations (
				risk_id, action, owner, owner_user_id, due_date, frequency, recurring_interval, report_day, report_date, execution_schedule_text, target_cost, sort_order,
				mitigation_type, activity_stage, expected_output, quantitative_target, supporting_unit, resources_required, contingency_plan, potential_obstacle, is_breakthrough_activity, is_existing_control
			)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
			risk.ID, m.Action, m.Owner, m.OwnerUserID, nullableDateString(m.DueDate), frequency, m.RecurringInterval, m.ReportDay, m.ReportDate, m.ExecutionScheduleText, m.TargetCost, i+1,
			mitigationType, m.ActivityStage, m.ExpectedOutput, m.QuantitativeTarget, m.SupportingUnit, m.ResourcesRequired, m.ContingencyPlan, m.PotentialObstacle, m.IsBreakthroughActivity, m.IsExistingControl)
		if err != nil {
			return fmt.Errorf("upsert mitigation: %w", err)
		}
	}

	if risk.FinalizeRequested {
		var actor any
		if risk.FinalizedBy != nil && *risk.FinalizedBy != uuid.Nil {
			actor = *risk.FinalizedBy
		}
		effectiveFrom := time.Now().UTC()
		if risk.EffectiveFrom != nil {
			effectiveFrom = risk.EffectiveFrom.UTC()
		}
		if _, err := q.Exec(ctx,
			`UPDATE risks
			 SET finalized_by = $2,
			     finalized_at = COALESCE($3::timestamptz, now()),
			     effective_from = $4::date,
			     updated_at = now()
			 WHERE id = $1 AND status = 'final'`,
			risk.ID, actor, risk.FinalizedAt, effectiveFrom,
		); err != nil {
			return fmt.Errorf("record risk finalization: %w", err)
		}

		if risk.PreviousRiskID != nil {
			if err := activateApprovedVersionWithQueryer(ctx, q, risk.ID); err != nil {
				return err
			}
		}
		if err := ensureMonitoringPeriodsForRisk(ctx, q, risk.VersionGroupID, effectiveFrom, risk.AssessmentCycle); err != nil {
			return err
		}
	}
	return nil
}

func normalizeMitigationFrequency(value string) string {
	if value == "rutin" {
		return value
	}
	return "insidental"
}

func mustJSON(value any) []byte {
	encoded, err := json.Marshal(value)
	if err != nil {
		return []byte("[]")
	}
	return encoded
}

func getInProgressReassessmentForCycle(ctx context.Context, q riskQueryer, versionGroupID uuid.UUID, cycle string) (*entity.Risk, error) {
	risk := &entity.Risk{}
	err := q.QueryRow(ctx,
		`SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id,
		        r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id,
		        r.objective_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai,
		        ROUND(COALESCE(r.nilai, 0))::int, r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
		        r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''),
		        COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''), r.review_started_at,
		        r.review_submitted_at, r.review_approved_at,
		        COALESCE(o.name, '')
		 FROM risks r
		 LEFT JOIN organizations o ON o.id = r.organization_id
		 WHERE r.version_group_id = $1
		   AND COALESCE(r.assessment_cycle, '') = $2
		   AND r.status = 'draft'
		 ORDER BY r.created_at DESC
		 LIMIT 1`,
		versionGroupID, cycle,
	).Scan(
		&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID,
		&risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID,
		&risk.ObjectiveID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
		&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
		&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai,
		&risk.InherentScore, &risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
		&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
		&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType,
		&risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt,
		&risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
		&risk.OrgName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("load in-progress reassessment: %w", err)
	}
	return risk, nil
}

func cloneRiskForPeriodicReassessment(sourceRisk *entity.Risk, cycle string, startedAt time.Time) *entity.Risk {
	clone := *sourceRisk
	clone.ID = uuid.Nil
	clone.PreviousRiskID = &sourceRisk.ID
	clone.IsCurrent = false
	clone.IsCycleCurrent = false
	clone.Status = entity.RiskStatusDraft
	clone.ArchivedAt = nil
	clone.ArchivedReason = ""
	clone.AssessmentCycle = cycle
	clone.ReviewType = "periodic"
	clone.ReviewStartedAt = &startedAt
	clone.ReviewSubmittedAt = nil
	clone.ReviewApprovedAt = nil
	clone.Cause = append([]string(nil), sourceRisk.Cause...)
	clone.ImpactDesc = append([]string(nil), sourceRisk.ImpactDesc...)
	clone.Mitigations = make([]entity.Mitigation, len(sourceRisk.Mitigations))
	for i, mitigation := range sourceRisk.Mitigations {
		copied := mitigation
		copied.ID = uuid.Nil
		copied.RiskID = uuid.Nil
		copied.CreatedAt = time.Time{}
		clone.Mitigations[i] = copied
	}
	clone.VersionNumber = sourceRisk.VersionNumber + 1
	return &clone
}

// Delete deletes a risk
func (r *riskRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM risks WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete risk: %w", err)
	}
	return nil
}

// List retrieves risks with optional filters
func (r *riskRepository) List(ctx context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error) {
	status = normalizeRiskStatusFilter(status)
	query := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.ro_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
	                  r.cause, r.risk_source, r.controllability, r.impact_description,
		                  r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, ROUND(COALESCE(r.nilai, 0))::int,
	                  r.risk_priority, r.risk_appetite, r.treatment_option,
		                  r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
	                  r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
	                  r.review_started_at, r.review_submitted_at, r.review_approved_at,
	                  r.created_at, r.updated_at,
	                  COALESCE(o.name, '') as org_name,
	                  COALESCE(u.name, '') as created_by_name,
	                  draft.id as draft_id,
	                  draft.status as draft_status,
	                  CASE WHEN draft.id IS NOT NULL THEN true ELSE false END as has_ongoing
	           FROM risks r
	           LEFT JOIN organizations o ON r.organization_id = o.id
	           LEFT JOIN users u ON r.created_by = u.id
	           LEFT JOIN risks draft ON 
	             draft.code = r.code 
	             AND draft.status = 'draft'
	             AND draft.created_at > r.created_at
	             AND draft.archived_at IS NULL`
	var args []interface{}
	argIdx := 1

	if status == entity.RiskStatusDraft {
		query += " WHERE r.status = 'draft' AND r.version_number = 1 AND r.archived_at IS NULL"
	} else {
		query += " WHERE r.is_current = TRUE AND r.archived_at IS NULL"
	}

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
		args = append(args, uuidArrayToStrings(orgIDs))
		argIdx++
	}
	if status != "" && status != "all" && status != entity.RiskStatusDraft {
		query += fmt.Sprintf(" AND r.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if category != "" {
		query += fmt.Sprintf(" AND r.category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}
	query += " ORDER BY (r.nilai * 10000 + r.impact * 100) DESC, r.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list risks: %w", err)
	}
	defer rows.Close()

	var risks []*entity.Risk
	for rows.Next() {
		var risk entity.Risk
		var roID uuid.NullUUID
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &roID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore, &risk.ResidualAcceptanceReason,
			&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary,
			&risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
			&risk.DraftID, &risk.DraftStatus, &risk.HasOngoing,
		); err != nil {
			return nil, fmt.Errorf("scan risk: %w", err)
		}
		risk.ROID = nullableUUIDPtr(roID)
		risks = append(risks, &risk)
	}
	return risks, nil
}

func (r *riskRepository) ListRegister(ctx context.Context, filter repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	filter.Status = normalizeRiskStatusFilter(filter.Status)
	countQuery := `SELECT COUNT(*)
		FROM risks r
		WHERE 1=1`
	dataQuery := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
		                  r.cause, r.risk_source, r.controllability, r.impact_description,
		                  r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, ROUND(COALESCE(r.nilai, 0))::int,
		                  r.risk_priority, r.risk_appetite, r.treatment_option,
		                  r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
		                  r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
		                  r.review_started_at, r.review_submitted_at, r.review_approved_at,
		                  r.created_at, r.updated_at,
		                  COALESCE(o.name, '') as org_name,
		                  COALESCE(u.name, '') as created_by_name,
		                  draft.id as draft_id,
		                  draft.status as draft_status,
		                  CASE WHEN draft.id IS NOT NULL THEN true ELSE false END as has_ongoing,
		                  monitoring.status as monitoring_status,
		                  monitoring_last.last_monitored_at as last_monitored_at,
		                  COALESCE(monitoring_score.source_nilai, prev.nilai, r.nilai) as before_monitoring_nilai,
		                  monitoring_score.observed_nilai as monitoring_result_nilai,
		                  quarters.q1 as quarter_q1,
		                  quarters.q2 as quarter_q2,
		                  quarters.q3 as quarter_q3,
		                  quarters.q4 as quarter_q4
		           FROM risks r
		           LEFT JOIN organizations o ON r.organization_id = o.id
		           LEFT JOIN users u ON r.created_by = u.id
		           LEFT JOIN risks prev ON prev.id = r.previous_risk_id
			   LEFT JOIN LATERAL (
			     SELECT rm.source_nilai, rm.observed_nilai
			     FROM risk_monitorings rm
			     WHERE (rm.source_risk_id = r.id OR rm.result_risk_id = r.id)
			       AND rm.status = 'final'
			     ORDER BY rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
		             LIMIT 1
		           ) monitoring_score ON true
		           LEFT JOIN risks draft ON 
		             draft.code = r.code 
	             AND draft.status = 'draft'
		             AND draft.created_at > r.created_at
		             AND draft.archived_at IS NULL
		           LEFT JOIN LATERAL (
		             SELECT rm.status
		             FROM risk_monitorings rm
		             WHERE (rm.source_risk_id = r.id OR rm.result_risk_id = r.id)
		               AND rm.status IN ('draft', 'final')
		               AND COALESCE(r.assessment_cycle, '') <> ''
		               AND rm.assessment_cycle = r.assessment_cycle
		             ORDER BY rm.updated_at DESC, rm.id DESC
		             LIMIT 1
		           ) monitoring ON true
		           LEFT JOIN LATERAL (
		             SELECT MAX(rm.finalized_at) AS last_monitored_at
		             FROM risk_monitorings rm
		             WHERE (rm.source_risk_id = r.id OR rm.result_risk_id = r.id)
		               AND rm.finalized_at IS NOT NULL
		           ) monitoring_last ON true
		           LEFT JOIN LATERAL (
		             SELECT
		               MAX(CASE WHEN rm.assessment_cycle = EXTRACT(YEAR FROM NOW())::text || '-Q1' THEN rm.status END) AS q1,
		               MAX(CASE WHEN rm.assessment_cycle = EXTRACT(YEAR FROM NOW())::text || '-Q2' THEN rm.status END) AS q2,
		               MAX(CASE WHEN rm.assessment_cycle = EXTRACT(YEAR FROM NOW())::text || '-Q3' THEN rm.status END) AS q3,
		               MAX(CASE WHEN rm.assessment_cycle = EXTRACT(YEAR FROM NOW())::text || '-Q4' THEN rm.status END) AS q4
		             FROM risk_monitorings rm
		             WHERE rm.version_group_id = r.version_group_id
		               AND rm.assessment_cycle IN (
		                 EXTRACT(YEAR FROM NOW())::text || '-Q1',
		                 EXTRACT(YEAR FROM NOW())::text || '-Q2',
		                 EXTRACT(YEAR FROM NOW())::text || '-Q3',
		                 EXTRACT(YEAR FROM NOW())::text || '-Q4'
		               )
		           ) quarters ON true
		           WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if filter.View == "monitoring-transactions" {
		countQuery += " AND r.version_number > 1"
		dataQuery += " AND r.version_number > 1"
	} else if filter.Status == entity.RiskStatusDraft {
		countQuery += " AND r.status = 'draft'"
		dataQuery += " AND r.status = 'draft'"
	} else {
		countQuery += " AND r.is_current = TRUE"
		dataQuery += " AND r.is_current = TRUE"
	}

	switch filter.Lifecycle {
	case "", "active":
		countQuery += " AND r.archived_at IS NULL"
		dataQuery += " AND r.archived_at IS NULL"
	case "archived":
		countQuery += " AND r.archived_at IS NOT NULL"
		dataQuery += " AND r.archived_at IS NOT NULL"
	case "all":
	}

	if len(filter.OrgIDs) > 0 {
		clause := fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.OrgIDs)
		argIdx++
	}
	if filter.Status != "" && filter.Status != "all" && filter.Status != entity.RiskStatusDraft {
		clause := fmt.Sprintf(" AND r.status = $%d", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Category != "" {
		clause := fmt.Sprintf(" AND r.category = $%d", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.Category)
		argIdx++
	}
	if filter.AssessmentCycle != "" {
		clause := fmt.Sprintf(" AND COALESCE(r.assessment_cycle, '') = $%d", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.AssessmentCycle)
		argIdx++
	}
	if filter.CreatedAt != "" {
		clause := fmt.Sprintf(" AND r.created_at::date = $%d::date", argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, filter.CreatedAt)
		argIdx++
	}
	if filter.Query != "" {
		clause := fmt.Sprintf(" AND (COALESCE(r.code, '') ILIKE $%d OR COALESCE(r.title, '') ILIKE $%d OR COALESCE(r.description, '') ILIKE $%d)", argIdx, argIdx, argIdx)
		countQuery += clause
		dataQuery += clause
		args = append(args, "%"+filter.Query+"%")
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list risk register count: %w", err)
	}

	offset := (filter.Page - 1) * filter.Limit
	// Sort by priority (nilai * 10000 + impact * 100) by default, or by created_at if specified
	if filter.SortBy == "created_at" {
		orderDir := "DESC"
		if filter.SortOrder == "asc" {
			orderDir = "ASC"
		}
		dataQuery += fmt.Sprintf(" ORDER BY r.created_at %s, r.id DESC LIMIT $%d OFFSET $%d", orderDir, argIdx, argIdx+1)
	} else {
		// Default: sort by the same finalized monitoring score shown in the
		// register. Risks without a finalized monitoring result sort last.
		orderDir := "DESC"
		if filter.SortOrder == "asc" {
			orderDir = "ASC"
		}
		dataQuery += fmt.Sprintf(" ORDER BY monitoring_score.observed_nilai %s NULLS LAST, r.created_at DESC, r.id DESC LIMIT $%d OFFSET $%d", orderDir, argIdx, argIdx+1)
	}
	args = append(args, filter.Limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk register query: %w", err)
	}
	defer rows.Close()

	risks := make([]*entity.Risk, 0)
	for rows.Next() {
		var risk entity.Risk
		var q1, q2, q3, q4 *string
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore, &risk.ResidualAcceptanceReason,
			&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
			&risk.DraftID, &risk.DraftStatus, &risk.HasOngoing,
			&risk.MonitoringStatus, &risk.LastMonitoredAt,
			&risk.BeforeMonitoringNilai, &risk.MonitoringResultNilai,
			&q1, &q2, &q3, &q4,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk register row: %w", err)
		}
		if q1 != nil || q2 != nil || q3 != nil || q4 != nil {
			risk.SemesterMonitoring = &entity.SemesterMonitoringStatus{
				Q1: q1, Q2: q2, Q3: q3, Q4: q4,
			}
		}
		risks = append(risks, &risk)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list risk register rows: %w", err)
	}

	return risks, total, nil
}

func normalizeRiskStatusFilter(status string) string {
	switch strings.TrimSpace(status) {
	case "approved", "reviewed":
		return entity.RiskStatusFinal
	case "assessment_draft", "assessment_in_review", "in_review", "in_approval":
		return entity.RiskStatusDraft
	default:
		return status
	}
}

// ListApprovedRisks returns approved risks for trend analysis (one version per cycle per risk)
func (r *riskRepository) ListApprovedRisks(ctx context.Context, orgIDs []uuid.UUID, query string) ([]*entity.Risk, error) {
	queryStr := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
	                  r.cause, r.risk_source, r.controllability, r.impact_description,
		                  r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, ROUND(COALESCE(r.nilai, 0))::int,
	                  r.risk_priority, r.risk_appetite, r.treatment_option,
		                  r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
	                  r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
	                  r.review_started_at, r.review_submitted_at, r.review_approved_at,
	                  r.created_at, r.updated_at,
	                  COALESCE(o.name, '') as org_name,
	                  COALESCE(u.name, '') as created_by_name
	           FROM risks r
	           LEFT JOIN organizations o ON r.organization_id = o.id
	           LEFT JOIN users u ON r.created_by = u.id
	           WHERE r.id IN (
	           	SELECT DISTINCT ON (r2.version_group_id, r2.assessment_cycle) r2.id
	           	FROM risks r2
	           WHERE r2.status = 'final'
	           	ORDER BY r2.version_group_id, r2.assessment_cycle, r2.version_number DESC, r2.created_at DESC
	           )`
	var args []interface{}
	argIdx := 1

	if len(orgIDs) > 0 {
		queryStr += fmt.Sprintf(" AND r.organization_id = ANY($%d::uuid[])", argIdx)
		uuidStrs := make([]string, len(orgIDs))
		for i, id := range orgIDs {
			uuidStrs[i] = id.String()
		}
		args = append(args, uuidStrs)
		argIdx++
	}

	// Add search filter by code or title
	if query != "" {
		queryStr += fmt.Sprintf(" AND (r.code ILIKE $%d OR r.title ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+query+"%")
		argIdx++
	}

	queryStr += " ORDER BY r.assessment_cycle, r.created_at DESC"

	rows, err := r.pool.Query(ctx, queryStr, args...)
	if err != nil {
		return nil, fmt.Errorf("list approved risks: %w", err)
	}
	defer rows.Close()

	var risks []*entity.Risk
	for rows.Next() {
		var risk entity.Risk
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore, &risk.ResidualAcceptanceReason,
			&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
		); err != nil {
			return nil, fmt.Errorf("scan risk: %w", err)
		}
		risks = append(risks, &risk)
	}
	return risks, nil
}

// ListMitigations returns all mitigations joined with risk details
func (r *riskRepository) ListMitigations(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	query := `SELECT m.id, m.risk_id, m.action, m.owner, m.owner_user_id, m.due_date::text, m.frequency, m.recurring_interval, m.target_cost, m.sort_order, m.created_at,
	                 m.mitigation_type, m.activity_stage, m.expected_output, m.quantitative_target, m.supporting_unit, m.resources_required, m.contingency_plan, m.potential_obstacle, m.is_breakthrough_activity, m.is_existing_control,
	                 r.code as risk_code, r.title as risk_title, r.organization_id as risk_org_id, r.probability, r.impact
	          FROM mitigations m
	          JOIN risks r ON m.risk_id = r.id
	          WHERE r.status = 'final' AND r.is_current = TRUE AND r.is_cycle_current = TRUE AND r.archived_at IS NULL`
	var args []interface{}

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(orgIDs))
	}

	query += ` ORDER BY m.due_date ASC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list mitigations: %w", err)
	}
	defer rows.Close()

	var result []*entity.MitigationAssoc
	for rows.Next() {
		var ma entity.MitigationAssoc
		if err := rows.Scan(
			&ma.ID, &ma.RiskID, &ma.Action, &ma.Owner, &ma.OwnerUserID, &ma.DueDate, &ma.Frequency, &ma.RecurringInterval, &ma.TargetCost, &ma.SortOrder, &ma.CreatedAt,
			&ma.MitigationType, &ma.ActivityStage, &ma.ExpectedOutput, &ma.QuantitativeTarget, &ma.SupportingUnit, &ma.ResourcesRequired, &ma.ContingencyPlan, &ma.PotentialObstacle, &ma.IsBreakthroughActivity, &ma.IsExistingControl,
			&ma.RiskCode, &ma.RiskTitle, &ma.RiskOrgID, &ma.Probability, &ma.Impact,
		); err != nil {
			return nil, fmt.Errorf("scan mitigation assoc: %w", err)
		}
		result = append(result, &ma)
	}
	return result, nil
}

// NextRiskCode generates the next risk code like R-001, R-002, etc.
func (r *riskRepository) NextRiskCode(ctx context.Context) (string, error) {
	var maxCode *string
	err := r.pool.QueryRow(ctx,
		`SELECT MAX(code) FROM risks WHERE code LIKE 'R-%'`,
	).Scan(&maxCode)
	if err != nil || maxCode == nil {
		return "R-001", nil
	}

	parts := strings.Split(*maxCode, "-")
	if len(parts) != 2 {
		return "R-001", nil
	}
	var num int
	fmt.Sscanf(parts[1], "%d", &num)
	return fmt.Sprintf("R-%03d", num+1), nil
}

func currentQuarterCycle() string {
	now := time.Now().UTC()
	return fmt.Sprintf("%d-Q%d", now.Year(), (int(now.Month())-1)/3+1)
}

const dashboardRiskSnapshotCTE = `WITH risk_snapshots AS (
	SELECT DISTINCT ON (r.version_group_id) r.*
	FROM risks r
	WHERE r.status = 'final'
	  AND r.assessment_cycle <= $1
	ORDER BY r.version_group_id, r.assessment_cycle DESC, r.version_number DESC, r.created_at DESC
), dashboard_risks AS (
	SELECT snapshot.*,
	       COALESCE(m.observed_probability, snapshot.probability) AS effective_probability,
	       COALESCE(m.observed_impact, snapshot.impact) AS effective_impact,
	       COALESCE(m.observed_weight, snapshot.weight) AS effective_weight,
	       COALESCE(m.observed_nilai, snapshot.nilai) AS effective_nilai,
	       COALESCE(m.observed_nilai, snapshot.nilai) AS effective_inherent_score
	FROM risk_snapshots snapshot
	LEFT JOIN LATERAL (
		SELECT rm.observed_probability, rm.observed_impact, rm.observed_weight, rm.observed_nilai
		FROM risk_monitorings rm
		WHERE rm.version_group_id = snapshot.version_group_id
		  AND rm.status = 'final'
		  AND rm.assessment_cycle <= $1
		ORDER BY rm.assessment_cycle DESC, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
		LIMIT 1
	) m ON true
) `

// DashboardSummary returns KPI card data as of a specific cycle (or current versions if empty).
func (r *riskRepository) DashboardSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.DashboardSummary, error) {
	s := &entity.DashboardSummary{}
	if cycle == "" {
		cycle = currentQuarterCycle()
	}
	scoreExpr := "r.effective_inherent_score"
	var orgFilter string
	var orgArgs []interface{}
	if len(orgIDs) > 0 {
		orgFilter = " AND r.organization_id = ANY($%d)"
		orgArgs = []interface{}{orgIDs}
	}
	if cycle != "" {
		args := []interface{}{cycle}
		argIdx := 2
		q := dashboardRiskSnapshotCTE + "SELECT COUNT(*) FROM dashboard_risks r WHERE TRUE"
		if len(orgIDs) > 0 {
			q += fmt.Sprintf(orgFilter, argIdx)
			args = append(args, orgArgs...)
		}
		if err := r.pool.QueryRow(ctx, q, args...).Scan(&s.TotalRisks); err != nil {
			return nil, fmt.Errorf("count risks: %w", err)
		}
		args2 := []interface{}{cycle}
		q2 := dashboardRiskSnapshotCTE + fmt.Sprintf("SELECT COUNT(*) FROM dashboard_risks r WHERE (%s) >= 15", scoreExpr)
		if len(orgIDs) > 0 {
			q2 += fmt.Sprintf(orgFilter, argIdx)
			args2 = append(args2, orgArgs...)
		}
		if err := r.pool.QueryRow(ctx, q2, args2...).Scan(&s.HighExtreme); err != nil {
			return nil, fmt.Errorf("count high/extreme: %w", err)
		}
	} else {
		var args []interface{}
		argIdx := 1
		q := "SELECT COUNT(*) FROM risks r WHERE r.status = 'final' AND r.is_current = TRUE AND r.archived_at IS NULL"
		if len(orgIDs) > 0 {
			q += fmt.Sprintf(orgFilter, argIdx)
			args = append(args, orgArgs...)
		}
		if err := r.pool.QueryRow(ctx, q, args...).Scan(&s.TotalRisks); err != nil {
			return nil, fmt.Errorf("count risks: %w", err)
		}
		var args2 []interface{}
		q2 := "SELECT COUNT(*) FROM risks r WHERE r.status = 'final' AND r.is_current = TRUE AND r.archived_at IS NULL AND ROUND(COALESCE(r.nilai, 0))::int >= 15"
		if len(orgIDs) > 0 {
			q2 += fmt.Sprintf(orgFilter, argIdx)
			args2 = append(args2, orgArgs...)
		}
		if err := r.pool.QueryRow(ctx, q2, args2...).Scan(&s.HighExtreme); err != nil {
			return nil, fmt.Errorf("count high/extreme: %w", err)
		}
	}
	if len(orgIDs) > 0 {
		err := r.pool.QueryRow(ctx,
			"SELECT COUNT(*) FROM mitigation_tasks t JOIN risks r ON r.id = t.risk_id AND r.status = 'final' AND r.archived_at IS NULL WHERE t.due_date < CURRENT_DATE AND t.status IN ('pending','overdue') AND r.organization_id = ANY($1)",
			orgIDs).Scan(&s.OverdueMitig)
		if err != nil {
			return nil, fmt.Errorf("count overdue: %w", err)
		}
	} else {
		err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM mitigation_tasks t JOIN risks r ON r.id = t.risk_id AND r.status = 'final' AND r.archived_at IS NULL WHERE t.due_date < CURRENT_DATE AND t.status IN ('pending','overdue')").Scan(&s.OverdueMitig)
		if err != nil {
			return nil, fmt.Errorf("count overdue: %w", err)
		}
	}
	return s, nil
}

// DashboardCategoryCounts returns risk counts grouped by category as of a specific cycle.
func (r *riskRepository) DashboardCategoryCounts(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	var query string
	var args []interface{}
	if cycle == "" {
		cycle = currentQuarterCycle()
	}
	scoreExpr := "r.effective_inherent_score"
	if cycle != "" {
		query = dashboardRiskSnapshotCTE + fmt.Sprintf(`SELECT COALESCE(NULLIF(category, ''), 'uncategorized') as category,
		        COUNT(*) as count,
		        COUNT(*) FILTER (WHERE (%[1]s) < 5) as sangat_rendah,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 5 AND (%[1]s) < 10) as rendah,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 10 AND (%[1]s) < 15) as sedang,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 15 AND (%[1]s) < 20) as tinggi,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 20) as ekstrem
		 FROM dashboard_risks r
		 WHERE TRUE`, scoreExpr)
		args = []interface{}{cycle}
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($2)"
			args = append(args, uuidArrayToStrings(orgIDs))
		}
		query += `
		 GROUP BY 1
		 ORDER BY count DESC, category ASC`
	} else {
		query = fmt.Sprintf(`SELECT COALESCE(NULLIF(category, ''), 'uncategorized') as category,
		        COUNT(*) as count,
		        COUNT(*) FILTER (WHERE (%[1]s) < 5) as sangat_rendah,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 5 AND (%[1]s) < 10) as rendah,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 10 AND (%[1]s) < 15) as sedang,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 15 AND (%[1]s) < 20) as tinggi,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 20) as ekstrem
		 FROM risks r
		 WHERE r.is_current = TRUE AND r.status = 'final' AND r.archived_at IS NULL`, scoreExpr)
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($1)"
			args = append(args, uuidArrayToStrings(orgIDs))
		}
		query += `
		 GROUP BY 1
		 ORDER BY count DESC, category ASC`
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("dashboard category counts: %w", err)
	}
	defer rows.Close()

	var counts []*entity.DashboardCategoryCount
	for rows.Next() {
		var c entity.DashboardCategoryCount
		if err := rows.Scan(&c.Category, &c.Count, &c.SangatRendah, &c.Rendah, &c.Sedang, &c.Tinggi, &c.Ekstrem); err != nil {
			return nil, fmt.Errorf("scan category count: %w", err)
		}
		counts = append(counts, &c)
	}
	return counts, nil
}

// HeatmapData returns risk distribution as of a specific cycle (or current versions if empty).
func (r *riskRepository) HeatmapData(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.HeatmapCell, error) {
	var query string
	var args []interface{}
	if cycle == "" {
		cycle = currentQuarterCycle()
	}
	if cycle != "" {
		query = dashboardRiskSnapshotCTE + `SELECT r.effective_probability AS probability, r.effective_impact AS impact, COUNT(*) as cnt
		 FROM dashboard_risks r WHERE TRUE`
		args = []interface{}{cycle}
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($2)"
			args = append(args, uuidArrayToStrings(orgIDs))
		}
		query += " GROUP BY 1, 2"
	} else {
		query = `SELECT r.probability AS probability, r.impact AS impact, COUNT(*) as cnt
			 FROM risks r WHERE r.status = 'final' AND r.is_current = TRUE AND r.archived_at IS NULL`
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($1)"
			args = append(args, uuidArrayToStrings(orgIDs))
		}
		query += " GROUP BY 1, 2"
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("heatmap query: %w", err)
	}
	defer rows.Close()

	var cells []*entity.HeatmapCell
	for rows.Next() {
		var c entity.HeatmapCell
		if err := rows.Scan(&c.Probability, &c.Impact, &c.Count); err != nil {
			return nil, fmt.Errorf("scan heatmap: %w", err)
		}
		cells = append(cells, &c)
	}
	return cells, nil
}

func (r *riskRepository) HeatmapMultiPhase(ctx context.Context, year int, orgIDs []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	quarterCycles := [4]string{
		fmt.Sprintf("%d-Q1", year),
		fmt.Sprintf("%d-Q2", year),
		fmt.Sprintf("%d-Q3", year),
		fmt.Sprintf("%d-Q4", year),
	}
	yearLike := fmt.Sprintf("%d-%%", year)

	fillMatrix := func(rows pgx.Rows) ([5][5]int, error) {
		var m [5][5]int
		defer rows.Close()
		for rows.Next() {
			var p, i, cnt int
			if err := rows.Scan(&p, &i, &cnt); err != nil {
				return m, err
			}
			if p < 1 || p > 5 || i < 1 || i > 5 {
				continue
			}
			m[p-1][i-1] = cnt
		}
		return m, rows.Err()
	}

	runQuery := func(query string, args []interface{}) ([5][5]int, error) {
		rows, err := r.pool.Query(ctx, query, args...)
		if err != nil {
			return [5][5]int{}, fmt.Errorf("heatmap multiphase query: %w", err)
		}
		return fillMatrix(rows)
	}

	orgFilter := func(col string, startIdx int) (string, []interface{}) {
		if len(orgIDs) == 0 {
			return "", nil
		}
		return fmt.Sprintf(" AND %s = ANY($%d)", col, startIdx), []interface{}{uuidArrayToStrings(orgIDs)}
	}

	var result entity.HeatmapMultiPhase
	var eg errgroup.Group

	eg.Go(func() error {
		scope := `SELECT DISTINCT version_group_id FROM risks
			WHERE assessment_cycle LIKE $1
			  AND status = 'final'
			  AND archived_at IS NULL`
		args := []interface{}{yearLike}
		if clause, extra := orgFilter("organization_id", 2); clause != "" {
			scope += clause
			args = append(args, extra...)
		}
		query := `SELECT probability, impact, COUNT(*) FROM risks
			WHERE version_number = 1
			  AND probability IS NOT NULL AND impact IS NOT NULL
			  AND version_group_id IN (` + scope + `)
			GROUP BY 1, 2`
		m, err := runQuery(query, args)
		if err != nil {
			return err
		}
		result.Initial = m
		return nil
	})

	quarterQuery := func(cycle string) (string, []interface{}) {
		// Quarterly phases represent finalized monitoring observations. A
		// score-only monitoring therefore appears here even though it does not
		// create a new risk version.
		query := `SELECT COALESCE(rm.observed_probability, source.probability),
		                 COALESCE(rm.observed_impact, source.impact),
		                 COUNT(*)
			FROM risk_monitorings rm
			JOIN risks source ON source.id = rm.source_risk_id
			WHERE rm.status = 'final'
			  AND rm.assessment_cycle = $1
			  AND COALESCE(rm.observed_probability, source.probability) IS NOT NULL
			  AND COALESCE(rm.observed_impact, source.impact) IS NOT NULL`
		args := []interface{}{cycle}
		if clause, extra := orgFilter("source.organization_id", 2); clause != "" {
			query += clause
			args = append(args, extra...)
		}
		query += " GROUP BY 1, 2"
		return query, args
	}

	eg.Go(func() error {
		q, args := quarterQuery(quarterCycles[0])
		m, err := runQuery(q, args)
		if err != nil {
			return err
		}
		result.Quarter1 = m
		return nil
	})

	eg.Go(func() error {
		q, args := quarterQuery(quarterCycles[1])
		m, err := runQuery(q, args)
		if err != nil {
			return err
		}
		result.Quarter2 = m
		result.Semester1 = m
		return nil
	})

	eg.Go(func() error {
		q, args := quarterQuery(quarterCycles[2])
		m, err := runQuery(q, args)
		if err != nil {
			return err
		}
		result.Quarter3 = m
		return nil
	})

	eg.Go(func() error {
		q, args := quarterQuery(quarterCycles[3])
		m, err := runQuery(q, args)
		if err != nil {
			return err
		}
		result.Quarter4 = m
		result.Semester2 = m
		return nil
	})

	eg.Go(func() error {
		query := `SELECT target_probability, target_impact, COUNT(*) FROM risks
			WHERE status = 'final'
			  AND is_cycle_current = TRUE
			  AND assessment_cycle LIKE $1
			  AND archived_at IS NULL
			  AND target_probability IS NOT NULL AND target_impact IS NOT NULL`
		args := []interface{}{yearLike}
		if clause, extra := orgFilter("organization_id", 2); clause != "" {
			query += clause
			args = append(args, extra...)
		}
		query += " GROUP BY 1, 2"
		m, err := runQuery(query, args)
		if err != nil {
			return err
		}
		result.Target = m
		return nil
	})

	if err := eg.Wait(); err != nil {
		return nil, err
	}
	return &result, nil
}
func (r *riskRepository) TopRisks(ctx context.Context, cycle string, limit int, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	var query string
	var args []interface{}
	if cycle == "" {
		cycle = currentQuarterCycle()
	}
	if cycle != "" {
		query = dashboardRiskSnapshotCTE + `SELECT r.id, r.code, r.title, r.category, r.effective_probability, r.effective_impact, r.effective_inherent_score, r.effective_nilai, r.status,
		        COALESCE(o.name, '') as org_name
		 FROM dashboard_risks r LEFT JOIN organizations o ON r.organization_id = o.id
		 WHERE TRUE`
		args = []interface{}{cycle}
		argIdx := 2
		if len(orgIDs) > 0 {
			query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
			args = append(args, uuidArrayToStrings(orgIDs))
			argIdx++
		}
		query += fmt.Sprintf(`
		 ORDER BY (r.effective_nilai * 10000 + r.effective_impact * 100) DESC, r.created_at DESC
		 LIMIT $%d`, argIdx)
		args = append(args, limit)
	} else {
		query = `SELECT r.id, r.code, r.title, r.category, r.probability, r.impact, ROUND(COALESCE(r.nilai, 0))::int, r.nilai, r.status,
		        COALESCE(o.name, '') as org_name
		 FROM risks r LEFT JOIN organizations o ON r.organization_id = o.id
		 WHERE r.status = 'final' AND r.is_current = TRUE AND r.archived_at IS NULL`
		argIdx := 1
		if len(orgIDs) > 0 {
			query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
			args = append(args, uuidArrayToStrings(orgIDs))
			argIdx++
		}
		query += fmt.Sprintf(`
		 ORDER BY (r.nilai * 10000 + r.impact * 100) DESC, r.created_at DESC
		 LIMIT $%d`, argIdx)
		args = append(args, limit)
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("top risks: %w", err)
	}
	defer rows.Close()

	var risks []*entity.Risk
	for rows.Next() {
		var risk entity.Risk
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Category, &risk.Probability, &risk.Impact, &risk.InherentScore, &risk.Nilai, &risk.Status,
			&risk.OrgName,
		); err != nil {
			return nil, fmt.Errorf("scan top risk: %w", err)
		}
		risks = append(risks, &risk)
	}
	return risks, nil
}

// ListVersions returns all versions for a risk group ordered newest first.
func (r *riskRepository) ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, ROUND(COALESCE(r.nilai, 0))::int,
		        r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
		        r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
		        r.review_started_at, r.review_submitted_at, r.review_approved_at,
		        r.created_at, r.updated_at,
		        COALESCE(o.name, '') as org_name,
		        COALESCE(u.name, '') as created_by_name
		 FROM risks r
		 LEFT JOIN organizations o ON r.organization_id = o.id
		 LEFT JOIN users u ON r.created_by = u.id
		 WHERE r.version_group_id = $1
		 ORDER BY r.created_at DESC`, versionGroupID)
	if err != nil {
		return nil, fmt.Errorf("list risk versions: %w", err)
	}
	defer rows.Close()

	var risks []*entity.Risk
	for rows.Next() {
		var risk entity.Risk
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore, &risk.ResidualAcceptanceReason,
			&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
		); err != nil {
			return nil, fmt.Errorf("scan risk version: %w", err)
		}
		risks = append(risks, &risk)
	}
	return risks, nil
}

// ListCycleSnapshot returns the latest finalized risk profile as of a cycle and
// attaches that cycle's finalized monitoring observation when one exists.
//
// A score-only monitoring does not create a row in risks, so querying risks by
// assessment_cycle alone would silently drop it from historical reports and
// dashboard trends. The profile snapshot and monitoring observation are
// intentionally resolved independently here.
func (r *riskRepository) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	query := `WITH risk_snapshots AS (
		SELECT DISTINCT ON (r.version_group_id) r.*
		FROM risks r
		WHERE r.status = 'final'
		  AND COALESCE(r.assessment_cycle, '') <= $1
		ORDER BY r.version_group_id,
		         COALESCE(r.assessment_cycle, '') DESC,
		         r.version_number DESC,
		         r.created_at DESC,
		         r.id DESC
	)
	SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.ro_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, ROUND(COALESCE(r.nilai, 0))::int,
		        r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
		        r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
		        r.review_started_at, r.review_submitted_at, r.review_approved_at,
		        r.created_at, r.updated_at,
		        COALESCE(o.name, '') AS org_name,
		        COALESCE(u.name, '') AS created_by_name,
		        monitoring.assessment_cycle,
		        monitoring.mode,
		        monitoring.observed_probability,
		        monitoring.observed_impact,
		        monitoring.observed_weight,
		        monitoring.observed_nilai,
		        monitoring.observed_level
	 FROM risk_snapshots r
	 LEFT JOIN organizations o ON r.organization_id = o.id
	 LEFT JOIN users u ON r.created_by = u.id
	 LEFT JOIN LATERAL (
		 SELECT rm.assessment_cycle,
		        rm.mode,
		        rm.observed_probability,
		        rm.observed_impact,
		        rm.observed_weight,
		        rm.observed_nilai,
		        rm.observed_level
		 FROM risk_monitorings rm
		 WHERE rm.version_group_id = r.version_group_id
		   AND rm.assessment_cycle = $1
		   AND rm.status = 'final'
		 ORDER BY rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
		 LIMIT 1
	 ) monitoring ON TRUE
	 WHERE TRUE`
	args := []interface{}{cycle}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(orgIDs))
	}
	query += " ORDER BY COALESCE(o.name, ''), COALESCE(r.code, ''), r.title"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list cycle snapshot: %w", err)
	}
	defer rows.Close()

	risks := make([]*entity.Risk, 0)
	riskByID := make(map[uuid.UUID]*entity.Risk)
	riskIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		risk := &entity.Risk{}
		var roID uuid.NullUUID
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &roID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore, &risk.ResidualAcceptanceReason,
			&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
			&risk.MonitoringAssessmentCycle, &risk.MonitoringMode,
			&risk.MonitoringObservedProbability, &risk.MonitoringObservedImpact,
			&risk.MonitoringObservedWeight, &risk.MonitoringObservedNilai,
			&risk.MonitoringObservedLevel,
		); err != nil {
			return nil, fmt.Errorf("scan cycle snapshot risk: %w", err)
		}
		risk.ROID = nullableUUIDPtr(roID)
		risks = append(risks, risk)
		riskByID[risk.ID] = risk
		riskIDs = append(riskIDs, risk.ID)
	}
	if rows.Err() != nil {
		return nil, fmt.Errorf("iterate cycle snapshot risks: %w", rows.Err())
	}
	if len(riskIDs) == 0 {
		return risks, nil
	}

	mitigationRows, err := r.pool.Query(ctx,
		`SELECT id, risk_id, action, owner, owner_user_id, due_date::text, frequency, recurring_interval, report_day, report_date, COALESCE(execution_schedule_text, ''), target_cost, sort_order, created_at,
		        mitigation_type, activity_stage, expected_output, quantitative_target, supporting_unit, resources_required, contingency_plan, potential_obstacle, is_breakthrough_activity, is_existing_control
		 FROM mitigations
		 WHERE risk_id = ANY($1)
		 ORDER BY risk_id, sort_order, created_at`, riskIDs)
	if err != nil {
		return nil, fmt.Errorf("load cycle snapshot mitigations: %w", err)
	}
	defer mitigationRows.Close()

	for mitigationRows.Next() {
		var mitigation entity.Mitigation
		if err := mitigationRows.Scan(&mitigation.ID, &mitigation.RiskID, &mitigation.Action, &mitigation.Owner, &mitigation.OwnerUserID, &mitigation.DueDate, &mitigation.Frequency, &mitigation.RecurringInterval, &mitigation.ReportDay, &mitigation.ReportDate, &mitigation.ExecutionScheduleText, &mitigation.TargetCost, &mitigation.SortOrder, &mitigation.CreatedAt,
			&mitigation.MitigationType, &mitigation.ActivityStage, &mitigation.ExpectedOutput, &mitigation.QuantitativeTarget, &mitigation.SupportingUnit, &mitigation.ResourcesRequired, &mitigation.ContingencyPlan, &mitigation.PotentialObstacle, &mitigation.IsBreakthroughActivity, &mitigation.IsExistingControl); err != nil {
			return nil, fmt.Errorf("scan cycle snapshot mitigation: %w", err)
		}
		if risk := riskByID[mitigation.RiskID]; risk != nil {
			risk.Mitigations = append(risk.Mitigations, mitigation)
		}
	}
	if mitigationRows.Err() != nil {
		return nil, fmt.Errorf("iterate cycle snapshot mitigations: %w", mitigationRows.Err())
	}

	return risks, nil
}

// ActivateApprovedVersion marks a newly final version as current and archives the prior one.
func (r *riskRepository) ActivateApprovedVersion(ctx context.Context, approvedRiskID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin activate approved version: %w", err)
	}
	defer tx.Rollback(ctx)
	if err := activateApprovedVersionWithQueryer(ctx, tx, approvedRiskID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit activate approved version: %w", err)
	}
	return nil
}

func activateApprovedVersionWithQueryer(ctx context.Context, q riskQueryer, approvedRiskID uuid.UUID) error {
	var versionGroupID uuid.UUID
	var assessmentCycle string
	var nextReviewDate *string
	if err := q.QueryRow(ctx,
		`SELECT version_group_id, COALESCE(assessment_cycle, ''), next_review_date::text FROM risks WHERE id = $1`, approvedRiskID,
	).Scan(&versionGroupID, &assessmentCycle, &nextReviewDate); err != nil {
		return fmt.Errorf("load approved risk for activation: %w", err)
	}

	if _, err := q.Exec(ctx,
		`UPDATE risks
		 SET is_current = FALSE,
		     archived_at = now(),
		     archived_reason = CASE
		       WHEN archived_reason = '' THEN 'superseded by periodic reassessment'
		       ELSE archived_reason
		     END,
		     updated_at = now()
		 WHERE version_group_id = $1 AND is_current = TRUE AND id <> $2`, versionGroupID, approvedRiskID,
	); err != nil {
		return fmt.Errorf("archive current risk version: %w", err)
	}

	if assessmentCycle != "" {
		if _, err := q.Exec(ctx,
			`UPDATE risks
			 SET is_cycle_current = FALSE
			 WHERE version_group_id = $1 AND assessment_cycle = $2 AND is_cycle_current = TRUE AND id <> $3`,
			versionGroupID, assessmentCycle, approvedRiskID,
		); err != nil {
			return fmt.Errorf("unset previous cycle current: %w", err)
		}
	}

	var newNextReviewDate *string
	if nextReviewDate != nil {
		trimmed := strings.TrimSpace(*nextReviewDate)
		parsed, err := time.Parse("2006-01-02", trimmed)
		if err != nil {
			// Some legacy risks store a textual review period (e.g. "Mei - Juni").
			// Keep the existing value unchanged instead of failing activation.
			parsed = time.Time{}
		}
		if !parsed.IsZero() {
			next := parsed.AddDate(0, 6, 0).Format("2006-01-02")
			newNextReviewDate = &next
		}
	}

	if newNextReviewDate != nil {
		if _, err := q.Exec(ctx,
			`UPDATE risks
			 SET is_current = TRUE,
			     is_cycle_current = TRUE,
			     status = 'final',
			     review_approved_at = now(),
			     next_review_date = $2,
			     updated_at = now()
			 WHERE id = $1`, approvedRiskID, *newNextReviewDate,
		); err != nil {
			return fmt.Errorf("activate approved risk version: %w", err)
		}
	} else {
		if _, err := q.Exec(ctx,
			`UPDATE risks
			 SET is_current = TRUE,
			     is_cycle_current = TRUE,
			     status = 'final',
			     review_approved_at = now(),
			     updated_at = now()
			 WHERE id = $1`, approvedRiskID,
		); err != nil {
			return fmt.Errorf("activate approved risk version: %w", err)
		}
	}

	return nil
}

// ListReviewQueue returns current risks and their reassessment progress for a cycle.
// page=0 and limit=0 disables pagination, returning all rows.
func (r *riskRepository) ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string, search string, page int, limit int) ([]*entity.RiskReviewQueueItem, int, error) {
	baseCTE := `WITH risk_snapshots AS (
		SELECT DISTINCT ON (r.version_group_id) r.*
		FROM risks r
		WHERE r.status = 'final'
		  AND COALESCE(r.assessment_cycle, '') <= $1
		ORDER BY r.version_group_id, COALESCE(r.assessment_cycle, '') DESC, r.version_number DESC, r.created_at DESC, r.id DESC
	)`
	baseFrom := ` FROM risk_snapshots base
	LEFT JOIN organizations org ON org.id = base.organization_id
	LEFT JOIN risk_monitoring_periods period
		ON period.version_group_id = base.version_group_id
		AND period.period_label = $1
	LEFT JOIN LATERAL (
		SELECT rm.id::text AS id,
		       rm.result_risk_id::text AS result_risk_id,
		       rm.status,
		       ROUND(rm.observed_nilai)::int AS observed_score,
		       COALESCE(rm.change_reason, '') AS change_reason,
		       COALESCE(rm.conclusion, '') AS review_summary,
		       rm.updated_at
		FROM risk_monitorings rm
		WHERE rm.version_group_id = base.version_group_id
		  AND rm.assessment_cycle = $1
		  AND rm.status IN ('draft', 'final')
		ORDER BY CASE WHEN rm.status = 'final' THEN 0 ELSE 1 END,
		         rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
		LIMIT 1
	) monitoring ON TRUE
	WHERE TRUE`

	args := []interface{}{cycle}
	if len(orgIDs) > 0 {
		baseFrom += fmt.Sprintf(" AND base.organization_id = ANY($%d::uuid[])", len(args)+1)
		uuidStrs := make([]string, len(orgIDs))
		for i, id := range orgIDs {
			uuidStrs[i] = id.String()
		}
		args = append(args, uuidStrs)
	}
	if status != "" && status != "all" {
		baseFrom += fmt.Sprintf(` AND (
			CASE
				WHEN monitoring.status = 'draft' THEN 'in_draft'
				WHEN monitoring.status = 'final' THEN 'final'
				WHEN period.due_date IS NOT NULL AND period.due_date < CURRENT_DATE THEN 'overdue'
				WHEN period.due_date IS NULL AND base.next_review_date IS NOT NULL AND base.next_review_date::date < CURRENT_DATE THEN 'overdue'
				WHEN monitoring.id IS NULL THEN 'due'
				ELSE 'due'
			END
		) = $%d`, len(args)+1)
		args = append(args, status)
	}
	if search != "" {
		baseFrom += fmt.Sprintf(` AND (
			base.code ILIKE '%%' || $%[1]d || '%%'
			OR base.title ILIKE '%%' || $%[1]d || '%%'
			OR COALESCE(org.name, '') ILIKE '%%' || $%[1]d || '%%'
			OR COALESCE(monitoring.change_reason, '') ILIKE '%%' || $%[1]d || '%%'
			OR COALESCE(monitoring.review_summary, '') ILIKE '%%' || $%[1]d || '%%'
		)`, len(args)+1)
		args = append(args, search)
	}

	countQuery := "SELECT COUNT(*) " + baseFrom
	var total int
	if err := r.pool.QueryRow(ctx, baseCTE+countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk review queue: %w", err)
	}

	query := baseCTE + fmt.Sprintf(`SELECT
		base.id::text,
		base.version_group_id::text,
		base.code,
		base.title,
		COALESCE(org.name, '') AS org_name,
		base.status,
		CASE
			WHEN monitoring.status = 'draft' THEN 'in_draft'
			WHEN monitoring.status = 'final' THEN 'final'
			WHEN period.due_date IS NOT NULL AND period.due_date < CURRENT_DATE THEN 'overdue'
			WHEN period.due_date IS NULL AND base.next_review_date IS NOT NULL AND base.next_review_date::date < CURRENT_DATE THEN 'overdue'
			WHEN monitoring.id IS NULL THEN 'due'
			ELSE 'due'
		END AS review_status,
		$1 AS assessment_cycle,
		ROUND(COALESCE(base.nilai, 0))::int AS current_score,
		CASE
			WHEN ROUND(COALESCE(base.nilai, 0))::int >= 20 THEN 'extreme'
			WHEN ROUND(COALESCE(base.nilai, 0))::int >= 15 THEN 'high'
			WHEN ROUND(COALESCE(base.nilai, 0))::int >= 10 THEN 'medium'
			WHEN ROUND(COALESCE(base.nilai, 0))::int >= 5 THEN 'low'
			ELSE 'very_low'
		END AS current_level,
		monitoring.id,
		monitoring.result_risk_id,
		monitoring.status,
		monitoring.observed_score AS candidate_score,
		CASE
			WHEN monitoring.observed_score IS NULL THEN NULL
			WHEN monitoring.observed_score >= 20 THEN 'extreme'
			WHEN monitoring.observed_score >= 15 THEN 'high'
			WHEN monitoring.observed_score >= 10 THEN 'medium'
			WHEN monitoring.observed_score >= 5 THEN 'low'
			ELSE 'very_low'
		END AS candidate_level,
		COALESCE(period.due_date::text, base.next_review_date::text),
		COALESCE(monitoring.change_reason, ''),
		COALESCE(monitoring.review_summary, ''),
		monitoring.updated_at::text
	`) + baseFrom + " ORDER BY base.next_review_date NULLS LAST, base.updated_at DESC"

	if page > 0 && limit > 0 {
		offset := (page - 1) * limit
		query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
		args = append(args, limit, offset)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk review queue: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskReviewQueueItem, 0)
	for rows.Next() {
		item := &entity.RiskReviewQueueItem{}
		if err := rows.Scan(
			&item.RiskID,
			&item.VersionGroupID,
			&item.Code,
			&item.Title,
			&item.OrgName,
			&item.CurrentStatus,
			&item.ReviewStatus,
			&item.AssessmentCycle,
			&item.CurrentScore,
			&item.CurrentLevel,
			&item.MonitoringID,
			&item.CandidateRiskID,
			&item.CandidateStatus,
			&item.CandidateScore,
			&item.CandidateLevel,
			&item.NextReviewDate,
			&item.ChangeReason,
			&item.ReviewSummary,
			&item.CandidateUpdated,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk review queue: %w", err)
		}
		items = append(items, item)
	}

	return items, total, nil
}

// CompareCycles returns approved risk movement between two cycles.
func (r *riskRepository) CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	query := `WITH current_snapshots AS (
		SELECT DISTINCT ON (r.version_group_id) r.*
		FROM risks r
		WHERE r.status = 'final'
		  AND COALESCE(r.assessment_cycle, '') <= $2
		ORDER BY r.version_group_id, COALESCE(r.assessment_cycle, '') DESC, r.version_number DESC, r.created_at DESC, r.id DESC
	), previous_snapshots AS (
		SELECT DISTINCT ON (r.version_group_id) r.*
		FROM risks r
		WHERE r.status = 'final'
		  AND COALESCE(r.assessment_cycle, '') <= $1
		ORDER BY r.version_group_id, COALESCE(r.assessment_cycle, '') DESC, r.version_number DESC, r.created_at DESC, r.id DESC
	), current_monitorings AS (
		SELECT DISTINCT ON (rm.version_group_id)
			rm.version_group_id,
			rm.observed_nilai,
			rm.change_reason
		FROM risk_monitorings rm
		WHERE rm.assessment_cycle = $2
		  AND rm.status = 'final'
		ORDER BY rm.version_group_id, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
	), previous_monitorings AS (
		SELECT DISTINCT ON (rm.version_group_id)
			rm.version_group_id,
			rm.observed_nilai
		FROM risk_monitorings rm
		WHERE rm.assessment_cycle = $1
		  AND rm.status = 'final'
		ORDER BY rm.version_group_id, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
	), scored AS (
		SELECT
			curr.version_group_id,
			curr.code,
			curr.title,
			COALESCE(org.name, '') AS org_name,
			CASE
				WHEN prev_monitoring.observed_nilai IS NOT NULL THEN ROUND(prev_monitoring.observed_nilai)::int
				WHEN prev.assessment_cycle = $1 THEN ROUND(COALESCE(prev.nilai, 0))::int
				ELSE 0
			END AS prev_score,
			COALESCE(ROUND(current_monitoring.observed_nilai)::int, ROUND(COALESCE(curr.nilai, 0))::int) AS curr_score,
			(prev_monitoring.version_group_id IS NOT NULL OR prev.assessment_cycle = $1) AS has_previous,
			COALESCE(NULLIF(current_monitoring.change_reason, ''), curr.change_reason, '') AS change_reason
		FROM current_monitorings current_monitoring
		JOIN current_snapshots curr ON curr.version_group_id = current_monitoring.version_group_id
		LEFT JOIN previous_monitorings prev_monitoring ON prev_monitoring.version_group_id = curr.version_group_id
		LEFT JOIN previous_snapshots prev ON prev.version_group_id = curr.version_group_id
		LEFT JOIN organizations org ON org.id = curr.organization_id
		WHERE TRUE`
	args := []interface{}{fromCycle, toCycle}
	if len(orgIDs) > 0 {
		query += " AND curr.organization_id = ANY($3)"
		args = append(args, uuidArrayToStrings(orgIDs))
	}

	query += `)
	SELECT
		version_group_id::text,
		code,
		title,
		org_name,
		$1 AS from_cycle,
		$2 AS to_cycle,
		prev_score,
		curr_score,
		CASE
			WHEN prev_score >= 20 THEN 'extreme'
			WHEN prev_score >= 15 THEN 'high'
			WHEN prev_score >= 10 THEN 'medium'
			WHEN prev_score >= 5 THEN 'low'
			ELSE 'very_low'
		END AS previous_level,
		CASE
			WHEN curr_score >= 20 THEN 'extreme'
			WHEN curr_score >= 15 THEN 'high'
			WHEN curr_score >= 10 THEN 'medium'
			WHEN curr_score >= 5 THEN 'low'
			ELSE 'very_low'
		END AS current_level,
		(curr_score - prev_score) AS score_delta,
		CASE
			WHEN NOT has_previous THEN 'new'
			WHEN curr_score > prev_score THEN 'up'
			WHEN curr_score < prev_score THEN 'down'
			ELSE 'stable'
		END AS movement,
		change_reason
	FROM scored
	ORDER BY ABS(curr_score - prev_score) DESC, curr_score DESC, title ASC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("compare risk cycles: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskCycleComparisonItem, 0)
	for rows.Next() {
		item := &entity.RiskCycleComparisonItem{}
		if err := rows.Scan(
			&item.VersionGroupID,
			&item.Code,
			&item.Title,
			&item.OrgName,
			&item.FromCycle,
			&item.ToCycle,
			&item.PreviousScore,
			&item.CurrentScore,
			&item.PreviousLevel,
			&item.CurrentLevel,
			&item.ScoreDelta,
			&item.Movement,
			&item.ChangeReason,
		); err != nil {
			return nil, fmt.Errorf("scan risk cycle comparison: %w", err)
		}
		items = append(items, item)
	}

	return items, nil
}

func previousCycle(cycle string) string {
	parts := strings.Split(cycle, "-")
	if len(parts) != 2 {
		return ""
	}
	var year int
	fmt.Sscanf(parts[0], "%d", &year)
	if len(parts[1]) == 2 && parts[1][0] == 'Q' {
		var quarter int
		if _, err := fmt.Sscanf(parts[1][1:], "%d", &quarter); err != nil || quarter < 1 || quarter > 4 {
			return ""
		}
		if quarter == 1 {
			return fmt.Sprintf("%d-Q4", year-1)
		}
		return fmt.Sprintf("%d-Q%d", year, quarter-1)
	}
	if parts[1] == "H1" {
		return fmt.Sprintf("%d-Q1", year)
	}
	if parts[1] == "H2" {
		return fmt.Sprintf("%d-Q3", year)
	}
	return cycle
}

// RiskReviewSummary returns aggregated cycle metrics for monitoring.
func (r *riskRepository) RiskReviewSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.RiskReviewSummary, error) {
	queue, _, err := r.ListReviewQueue(ctx, cycle, orgIDs, "all", "", 0, 0)
	if err != nil {
		return nil, fmt.Errorf("load review queue summary: %w", err)
	}
	summary := &entity.RiskReviewSummary{
		Cycle:           cycle,
		PreviousCycle:   previousCycle(cycle),
		UnitCompletion:  make([]*entity.RiskReviewUnitCompletion, 0),
		PreviousHeatmap: make([]*entity.HeatmapCell, 0),
		CurrentHeatmap:  make([]*entity.HeatmapCell, 0),
	}

	unitMap := make(map[string]*entity.RiskReviewUnitCompletion)
	for _, item := range queue {
		summary.TotalDue++
		unit := unitMap[item.OrgName]
		if unit == nil {
			unit = &entity.RiskReviewUnitCompletion{OrgName: item.OrgName}
			unitMap[item.OrgName] = unit
		}
		unit.TotalAssigned++
		switch item.ReviewStatus {
		case "final":
			summary.Completed++
			unit.Completed++
		case "in_draft":
			summary.InDraft++
			unit.Pending++
		case "overdue":
			summary.Overdue++
			unit.Overdue++
		}
	}
	for _, unit := range unitMap {
		if unit.TotalAssigned > 0 {
			unit.CompletionRate = float64(unit.Completed) * 100 / float64(unit.TotalAssigned)
		}
		summary.UnitCompletion = append(summary.UnitCompletion, unit)
	}
	sort.Slice(summary.UnitCompletion, func(i, j int) bool {
		if summary.UnitCompletion[i].CompletionRate == summary.UnitCompletion[j].CompletionRate {
			return summary.UnitCompletion[i].OrgName < summary.UnitCompletion[j].OrgName
		}
		return summary.UnitCompletion[i].CompletionRate > summary.UnitCompletion[j].CompletionRate
	})

	loadHeatmap := func(targetCycle string) ([]*entity.HeatmapCell, error) {
		query := `SELECT COALESCE(rm.observed_probability, source.probability) AS probability,
		                 COALESCE(rm.observed_impact, source.impact) AS impact,
		                 COUNT(*) AS cnt
		          FROM risk_monitorings rm
		          JOIN risks source ON source.id = rm.source_risk_id
		          WHERE rm.assessment_cycle = $1
		            AND rm.status = 'final'`
		args := []interface{}{targetCycle}
		if len(orgIDs) > 0 {
			query += fmt.Sprintf(" AND source.organization_id = ANY($%d)", len(args)+1)
			args = append(args, uuidArrayToStrings(orgIDs))
		}
		query += " GROUP BY 1, 2"
		rows, err := r.pool.Query(ctx, query, args...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		cells := make([]*entity.HeatmapCell, 0)
		for rows.Next() {
			cell := &entity.HeatmapCell{}
			if err := rows.Scan(&cell.Probability, &cell.Impact, &cell.Count); err != nil {
				return nil, err
			}
			cells = append(cells, cell)
		}
		return cells, nil
	}

	if summary.PreviousCycle != "" {
		summary.PreviousHeatmap, err = loadHeatmap(summary.PreviousCycle)
		if err != nil {
			return nil, fmt.Errorf("load previous heatmap: %w", err)
		}
	}
	summary.CurrentHeatmap, err = loadHeatmap(cycle)
	if err != nil {
		return nil, fmt.Errorf("load current heatmap: %w", err)
	}

	return summary, nil
}

func heatmapVelocityQuery() string {
	return `
	WITH current_monitorings AS (
		SELECT DISTINCT ON (rm.version_group_id)
			rm.id,
			rm.version_group_id,
			COALESCE(rm.observed_probability, source.probability) AS probability,
			COALESCE(rm.observed_impact, source.impact) AS impact,
			COALESCE(rm.observed_nilai, source.nilai) AS score
		FROM risk_monitorings rm
		JOIN risks source ON source.id = rm.source_risk_id
		WHERE rm.assessment_cycle = $2
		  AND rm.status = 'final'
		ORDER BY rm.version_group_id, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
	), previous_monitorings AS (
		SELECT DISTINCT ON (rm.version_group_id)
			rm.id,
			rm.version_group_id,
			COALESCE(rm.observed_nilai, source.nilai) AS score
		FROM risk_monitorings rm
		JOIN risks source ON source.id = rm.source_risk_id
		WHERE rm.assessment_cycle = $1
		  AND rm.status = 'final'
		ORDER BY rm.version_group_id, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
	), cycle_compare AS (
		SELECT
			curr.probability AS probability,
			curr.impact AS impact,
			CASE
				WHEN prev.id IS NULL THEN 'new'
				WHEN curr.score > prev.score THEN 'up'
				WHEN curr.score < prev.score THEN 'down'
				ELSE 'stable'
			END AS movement
		FROM current_monitorings curr
		LEFT JOIN previous_monitorings prev ON prev.version_group_id = curr.version_group_id
	)
	SELECT
		probability,
		impact,
		COUNT(*) AS count,
		COUNT(*) FILTER (WHERE movement = 'up') AS up_count,
		COUNT(*) FILTER (WHERE movement = 'down') AS down_count,
		COUNT(*) FILTER (WHERE movement = 'stable') AS stable_count,
		COUNT(*) FILTER (WHERE movement = 'new') AS new_count
	FROM cycle_compare
	GROUP BY probability, impact
	ORDER BY probability DESC, impact DESC`
}

func heatmapVelocityQueryScoped() string {
	return `
	WITH current_monitorings AS (
		SELECT DISTINCT ON (rm.version_group_id)
			rm.id,
			rm.version_group_id,
			COALESCE(rm.observed_probability, source.probability) AS probability,
			COALESCE(rm.observed_impact, source.impact) AS impact,
			COALESCE(rm.observed_nilai, source.nilai) AS score
		FROM risk_monitorings rm
		JOIN risks source ON source.id = rm.source_risk_id
		WHERE rm.assessment_cycle = $2
		  AND rm.status = 'final'
		  AND source.organization_id = ANY($3)
		ORDER BY rm.version_group_id, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
	), previous_monitorings AS (
		SELECT DISTINCT ON (rm.version_group_id)
			rm.id,
			rm.version_group_id,
			COALESCE(rm.observed_nilai, source.nilai) AS score
		FROM risk_monitorings rm
		JOIN risks source ON source.id = rm.source_risk_id
		WHERE rm.assessment_cycle = $1
		  AND rm.status = 'final'
		ORDER BY rm.version_group_id, rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
	), cycle_compare AS (
		SELECT
			curr.probability AS probability,
			curr.impact AS impact,
			CASE
				WHEN prev.id IS NULL THEN 'new'
				WHEN curr.score > prev.score THEN 'up'
				WHEN curr.score < prev.score THEN 'down'
				ELSE 'stable'
			END AS movement
		FROM current_monitorings curr
		LEFT JOIN previous_monitorings prev ON prev.version_group_id = curr.version_group_id
	)
	SELECT
		probability,
		impact,
		COUNT(*) AS count,
		COUNT(*) FILTER (WHERE movement = 'up') AS up_count,
		COUNT(*) FILTER (WHERE movement = 'down') AS down_count,
		COUNT(*) FILTER (WHERE movement = 'stable') AS stable_count,
		COUNT(*) FILTER (WHERE movement = 'new') AS new_count
	FROM cycle_compare
	GROUP BY probability, impact
	ORDER BY probability DESC, impact DESC`
}

func (r *riskRepository) GetHeatmapVelocity(ctx context.Context, fromCycle, toCycle string, orgIDs []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	query := heatmapVelocityQuery()
	args := []interface{}{fromCycle, toCycle}
	if len(orgIDs) > 0 {
		query = heatmapVelocityQueryScoped()
		args = append(args, uuidArrayToStrings(orgIDs))
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("heatmap velocity: %w", err)
	}
	defer rows.Close()

	cells := make([]entity.HeatmapVelocityCell, 0)
	for rows.Next() {
		var c entity.HeatmapVelocityCell
		if err := rows.Scan(&c.Probability, &c.Impact, &c.Count, &c.UpCount, &c.DownCount, &c.StableCount, &c.NewCount); err != nil {
			return nil, fmt.Errorf("scan heatmap velocity: %w", err)
		}
		cells = append(cells, c)
	}
	return cells, nil
}

func (r *riskRepository) GetOverdueMitigationTimeline(ctx context.Context, orgIDs []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	query := `
	SELECT
		COALESCE(org.id::text, '') AS org_id,
		COALESCE(org.name, '') AS org_name,
		COUNT(*) FILTER (
			WHERE mt.status = 'done'
				AND mt.reported_at IS NOT NULL
				AND mt.reported_at::date <= mt.due_date
		) AS on_time_count,
		COUNT(*) FILTER (
			WHERE mt.status != 'done'
				AND mt.due_date < CURRENT_DATE
				AND CURRENT_DATE - mt.due_date <= 7
		) AS overdue_7_count,
		COUNT(*) FILTER (
			WHERE mt.status != 'done'
				AND mt.due_date < CURRENT_DATE
				AND CURRENT_DATE - mt.due_date BETWEEN 8 AND 30
		) AS overdue_30_count,
		COUNT(*) FILTER (
			WHERE mt.status != 'done'
				AND mt.due_date < CURRENT_DATE
				AND CURRENT_DATE - mt.due_date > 30
		) AS overdue_30_plus_count,
		COUNT(*) AS total_count
	FROM mitigation_tasks mt
	JOIN mitigations m ON m.id = mt.mitigation_id
	JOIN risks r ON r.id = mt.risk_id
	LEFT JOIN organizations org ON org.id = r.organization_id`
	args := []interface{}{}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" WHERE r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(orgIDs))
	}
	query += ` GROUP BY org.id, org.name
	ORDER BY org.name ASC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("overdue mitigation timeline: %w", err)
	}
	defer rows.Close()

	items := make([]entity.OverdueMitigationTimelineItem, 0)
	for rows.Next() {
		var item entity.OverdueMitigationTimelineItem
		if err := rows.Scan(
			&item.OrgID, &item.OrgName,
			&item.OnTimeCount, &item.Overdue7Count, &item.Overdue30Count, &item.Overdue30PlusCount,
			&item.TotalCount,
		); err != nil {
			return nil, fmt.Errorf("scan overdue timeline: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *riskRepository) GetUnitResponseTime(ctx context.Context, orgIDs []uuid.UUID) ([]entity.UnitResponseTime, error) {
	orgFilter := ""
	args := []interface{}{}
	if len(orgIDs) > 0 {
		orgFilter = fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(orgIDs))
	}
	query := fmt.Sprintf(`
	WITH approval_timing AS (
		SELECT
			r.organization_id,
			AVG(EXTRACT(EPOCH FROM (ah.created_at - ar.requested_at)) / 86400) AS avg_approval_days
		FROM approval_requests ar
		JOIN approval_histories ah ON ah.approval_request_id = ar.id
		JOIN risks r ON r.id = ar.entity_id AND ar.request_type = 'risk'
		WHERE ah.created_at > ar.requested_at%s
		GROUP BY r.organization_id
	),
	mitigation_timing AS (
		SELECT
			r.organization_id,
			AVG(EXTRACT(EPOCH FROM (mt.reported_at - mt.created_at)) / 86400) AS avg_mitigation_days,
			COUNT(*) AS task_count
		FROM mitigation_tasks mt
		JOIN risks r ON r.id = mt.risk_id
		WHERE mt.status = 'done' AND mt.reported_at IS NOT NULL%s
		GROUP BY r.organization_id
	)
	SELECT
		org.id::text AS org_id,
		COALESCE(org.name, '') AS org_name,
		COALESCE(mt.avg_mitigation_days, 0) AS avg_mitigation_days,
		COALESCE(at.avg_approval_days, 0) AS avg_approval_days,
		COALESCE(mt.task_count, 0) AS task_count
	FROM organizations org
	LEFT JOIN mitigation_timing mt ON mt.organization_id = org.id
	LEFT JOIN approval_timing at ON at.organization_id = org.id`, orgFilter, orgFilter)
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" WHERE org.id = ANY($%d)", 1)
	}
	query += ` ORDER BY org.name ASC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("unit response time: %w", err)
	}
	defer rows.Close()

	items := make([]entity.UnitResponseTime, 0)
	for rows.Next() {
		var item entity.UnitResponseTime
		if err := rows.Scan(
			&item.OrgID, &item.OrgName,
			&item.AvgMitigationDays, &item.AvgApprovalDays, &item.TaskCount,
		); err != nil {
			return nil, fmt.Errorf("scan unit response time: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}
