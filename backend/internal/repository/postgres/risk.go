package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
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

// Create inserts a new risk and its mitigations
func (r *riskRepository) Create(ctx context.Context, risk *entity.Risk) error {
	return insertRiskWithQueryer(ctx, r.pool, risk)
}

func insertRiskWithQueryer(ctx context.Context, q riskQueryer, risk *entity.Risk) error {
	risk.CalculateAll()
	risk.CalculateTargetBobot()
	risk.CalculateTargetNilai()
	risk.CalculateTargetScore()

	err := q.QueryRow(ctx,
		`INSERT INTO risks (code, title, description, category, status, version_group_id, previous_risk_id, is_current, is_cycle_current, version_number, archived_at, archived_reason, organization_id, created_by,
		  cause, risk_source, controllability, impact_description,
		  existing_control, control_effectiveness, probability, impact, weight, nilai, inherent_score,
		  risk_priority, risk_appetite, treatment_option,
		  target_probability, target_impact, target_weight, target_nilai, target_score, next_review_date, assessment_cycle, review_type, change_reason, review_summary, review_started_at, review_submitted_at, review_approved_at, draft_approval_line)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)
		 RETURNING id, created_at, updated_at`,
		risk.Code, risk.Title, risk.Description, risk.Category, risk.Status, risk.VersionGroupID, risk.PreviousRiskID, risk.IsCurrent, risk.IsCycleCurrent, risk.VersionNumber, risk.ArchivedAt, risk.ArchivedReason, risk.OrganizationID, risk.CreatedBy,
		risk.Cause, risk.RiskSource, risk.Controllability, risk.ImpactDesc,
		risk.ExistingControl, risk.ControlEffectiveness, risk.Probability, risk.Impact, risk.Weight, risk.Nilai, risk.InherentScore,
		risk.RiskPriority, risk.RiskAppetite, risk.TreatmentOption,
		risk.TargetProbability, risk.TargetImpact, risk.TargetWeight, risk.TargetNilai, risk.TargetScore, risk.NextReviewDate,
		risk.AssessmentCycle, risk.ReviewType, risk.ChangeReason, risk.ReviewSummary, risk.ReviewStartedAt, risk.ReviewSubmittedAt, risk.ReviewApprovedAt, mustJSON(risk.DraftApprovalLine),
	).Scan(&risk.ID, &risk.CreatedAt, &risk.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create risk: %w", err)
	}

	for i, m := range risk.Mitigations {
		_, err := q.Exec(ctx,
			`INSERT INTO mitigations (risk_id, action, owner, owner_user_id, due_date, frequency, recurring_interval, report_day, report_date, execution_schedule_text, target_cost, sort_order)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
			risk.ID, m.Action, m.Owner, m.OwnerUserID, m.DueDate, m.Frequency, m.RecurringInterval, m.ReportDay, m.ReportDate, m.ExecutionScheduleText, m.TargetCost, i+1)
		if err != nil {
			return fmt.Errorf("create mitigation: %w", err)
		}
	}
	return nil
}

func (r *riskRepository) GetOrCreatePeriodicReassessmentInTx(ctx context.Context, sourceRisk *entity.Risk, cycle string) (*entity.Risk, bool, error) {
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

	query := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, r.inherent_score,
		        r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score,
		        r.next_review_date::text, COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
		        r.review_started_at, r.review_submitted_at, r.review_approved_at,
		        COALESCE(r.draft_approval_line, '[]'::jsonb),
		        r.created_at, r.updated_at,
		        COALESCE(o.name, '') as org_name,
		        COALESCE(u.name, '') as created_by_name
		 FROM risks r
		 LEFT JOIN organizations o ON r.organization_id = o.id
		 LEFT JOIN users u ON r.created_by = u.id
		 WHERE r.id = $1`
	args := []interface{}{id}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
	}

	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy,
		&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
		&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
		&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
		&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
		&risk.NextReviewDate, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
		&draftApprovalLineRaw,
		&risk.CreatedAt, &risk.UpdatedAt,
		&risk.OrgName, &risk.CreatedByName,
	)
	if err != nil {
		return nil, fmt.Errorf("find risk by id: %w", err)
	}
	if len(draftApprovalLineRaw) > 0 {
		if err := json.Unmarshal(draftApprovalLineRaw, &risk.DraftApprovalLine); err != nil {
			return nil, fmt.Errorf("unmarshal draft approval line: %w", err)
		}
	}

	// Load mitigations
	mRows, err := r.pool.Query(ctx,
		`SELECT id, risk_id, action, owner, owner_user_id, due_date::text, frequency, recurring_interval, report_day, report_date, COALESCE(execution_schedule_text, ''), target_cost, sort_order, created_at
		 FROM mitigations WHERE risk_id = $1 ORDER BY sort_order`, id)
	if err != nil {
		return nil, fmt.Errorf("load mitigations: %w", err)
	}
	defer mRows.Close()

	for mRows.Next() {
		var m entity.Mitigation
		if err := mRows.Scan(&m.ID, &m.RiskID, &m.Action, &m.Owner, &m.OwnerUserID, &m.DueDate, &m.Frequency, &m.RecurringInterval, &m.ReportDay, &m.ReportDate, &m.ExecutionScheduleText, &m.TargetCost, &m.SortOrder, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan mitigation: %w", err)
		}
		risk.Mitigations = append(risk.Mitigations, m)
	}

	return risk, nil
}

// Update updates an existing risk and replaces its mitigations
func (r *riskRepository) Update(ctx context.Context, risk *entity.Risk) error {
	risk.CalculateAll()
	risk.CalculateTargetBobot()
	risk.CalculateTargetNilai()
	risk.CalculateTargetScore()

	_, err := r.pool.Exec(ctx,
		`UPDATE risks SET code=$2, title=$3, description=$4, category=$5, status=$6, version_group_id=$7, previous_risk_id=$8, is_current=$9, is_cycle_current=$10, version_number=$11, archived_at=$12, archived_reason=$13, organization_id=$14,
		  cause=$15, risk_source=$16, controllability=$17, impact_description=$18,
		  existing_control=$19, control_effectiveness=$20, probability=$21, impact=$22, weight=$23, nilai=$24, inherent_score=$25,
		  risk_priority=$26, risk_appetite=$27, treatment_option=$28,
		  target_probability=$29, target_impact=$30, target_weight=$31, target_nilai=$32, target_score=$33, next_review_date=$34,
		  assessment_cycle=$35, review_type=$36, change_reason=$37, review_summary=$38, review_started_at=$39, review_submitted_at=$40, review_approved_at=$41,
		  draft_approval_line=$42,
		  updated_at=now()
		 WHERE id=$1`,
		risk.ID, risk.Code, risk.Title, risk.Description, risk.Category, risk.Status, risk.VersionGroupID, risk.PreviousRiskID, risk.IsCurrent, risk.IsCycleCurrent, risk.VersionNumber, risk.ArchivedAt, risk.ArchivedReason, risk.OrganizationID,
		risk.Cause, risk.RiskSource, risk.Controllability, risk.ImpactDesc,
		risk.ExistingControl, risk.ControlEffectiveness, risk.Probability, risk.Impact, risk.Weight, risk.Nilai, risk.InherentScore,
		risk.RiskPriority, risk.RiskAppetite, risk.TreatmentOption,
		risk.TargetProbability, risk.TargetImpact, risk.TargetWeight, risk.TargetNilai, risk.TargetScore, risk.NextReviewDate,
		risk.AssessmentCycle, risk.ReviewType, risk.ChangeReason, risk.ReviewSummary, risk.ReviewStartedAt, risk.ReviewSubmittedAt, risk.ReviewApprovedAt, mustJSON(risk.DraftApprovalLine),
	)
	if err != nil {
		return fmt.Errorf("update risk: %w", err)
	}

	// Replace mitigations
	_, _ = r.pool.Exec(ctx, "DELETE FROM mitigations WHERE risk_id = $1", risk.ID)
	for i, m := range risk.Mitigations {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO mitigations (risk_id, action, owner, owner_user_id, due_date, frequency, recurring_interval, report_day, report_date, execution_schedule_text, target_cost, sort_order)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
			risk.ID, m.Action, m.Owner, m.OwnerUserID, m.DueDate, m.Frequency, m.RecurringInterval, m.ReportDay, m.ReportDate, m.ExecutionScheduleText, m.TargetCost, i+1)
		if err != nil {
			return fmt.Errorf("upsert mitigation: %w", err)
		}
	}
	return nil
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
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai,
		        r.inherent_score, r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score,
		        r.next_review_date::text, COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''),
		        COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''), r.review_started_at,
		        r.review_submitted_at, r.review_approved_at,
		        COALESCE(o.name, '')
		 FROM risks r
		 LEFT JOIN organizations o ON o.id = r.organization_id
		 WHERE r.version_group_id = $1
		   AND COALESCE(r.assessment_cycle, '') = $2
		   AND r.status IN ('assessment_draft', 'assessment_in_review')
		 ORDER BY CASE WHEN r.status = 'assessment_draft' THEN 0 ELSE 1 END, r.created_at DESC
		 LIMIT 1`,
		versionGroupID, cycle,
	).Scan(
		&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID,
		&risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID,
		&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
		&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai,
		&risk.InherentScore, &risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
		&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
		&risk.NextReviewDate, &risk.AssessmentCycle, &risk.ReviewType,
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
	query := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by,
	                  r.cause, r.risk_source, r.controllability, r.impact_description,
	                  r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, r.inherent_score,
	                  r.risk_priority, r.risk_appetite, r.treatment_option,
	                  r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score,
	                  r.next_review_date::text, COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
	                  r.review_started_at, r.review_submitted_at, r.review_approved_at,
	                  r.created_at, r.updated_at,
	                  COALESCE(o.name, '') as org_name,
	                  COALESCE(u.name, '') as created_by_name
	           FROM risks r
	           LEFT JOIN organizations o ON r.organization_id = o.id
	           LEFT JOIN users u ON r.created_by = u.id`
	var args []interface{}
	argIdx := 1

	if status == entity.RiskStatusDraft {
		query += " WHERE r.status = 'assessment_draft' AND r.version_number = 1"
	} else {
		query += " WHERE r.is_current = TRUE"
	}

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
		args = append(args, orgIDs)
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
	query += " ORDER BY r.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list risks: %w", err)
	}
	defer rows.Close()

	var risks []*entity.Risk
	for rows.Next() {
		var risk entity.Risk
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
			&risk.NextReviewDate, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
		); err != nil {
			return nil, fmt.Errorf("scan risk: %w", err)
		}
		risks = append(risks, &risk)
	}
	return risks, nil
}

func (r *riskRepository) ListRegister(ctx context.Context, filter repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	countQuery := `SELECT COUNT(*)
		FROM risks r
		WHERE 1=1`
	dataQuery := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by,
	                  r.cause, r.risk_source, r.controllability, r.impact_description,
	                  r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, r.inherent_score,
	                  r.risk_priority, r.risk_appetite, r.treatment_option,
	                  r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score,
	                  r.next_review_date::text, COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
	                  r.review_started_at, r.review_submitted_at, r.review_approved_at,
	                  r.created_at, r.updated_at,
	                  COALESCE(o.name, '') as org_name,
	                  COALESCE(u.name, '') as created_by_name
	           FROM risks r
	           LEFT JOIN organizations o ON r.organization_id = o.id
	           LEFT JOIN users u ON r.created_by = u.id
	           WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if filter.Status == entity.RiskStatusDraft {
		countQuery += " AND r.status = 'assessment_draft'"
		dataQuery += " AND r.status = 'assessment_draft'"
	} else {
		countQuery += " AND r.is_current = TRUE"
		dataQuery += " AND r.is_current = TRUE"
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
	dataQuery += fmt.Sprintf(" ORDER BY r.created_at DESC, r.id DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk register query: %w", err)
	}
	defer rows.Close()

	risks := make([]*entity.Risk, 0)
	for rows.Next() {
		var risk entity.Risk
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
			&risk.NextReviewDate, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk register row: %w", err)
		}
		risks = append(risks, &risk)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list risk register rows: %w", err)
	}

	return risks, total, nil
}

// ListApprovedRisks returns approved risks for trend analysis (one version per cycle per risk)
func (r *riskRepository) ListApprovedRisks(ctx context.Context, orgIDs []uuid.UUID, query string) ([]*entity.Risk, error) {
	queryStr := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by,
	                  r.cause, r.risk_source, r.controllability, r.impact_description,
	                  r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, r.inherent_score,
	                  r.risk_priority, r.risk_appetite, r.treatment_option,
	                  r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score,
	                  r.next_review_date::text, COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
	                  r.review_started_at, r.review_submitted_at, r.review_approved_at,
	                  r.created_at, r.updated_at,
	                  COALESCE(o.name, '') as org_name,
	                  COALESCE(u.name, '') as created_by_name
	           FROM risks r
	           LEFT JOIN organizations o ON r.organization_id = o.id
	           LEFT JOIN users u ON r.created_by = u.id
	           WHERE r.is_cycle_current = TRUE`
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
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
			&risk.NextReviewDate, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
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
	                 r.code as risk_code, r.title as risk_title, r.organization_id as risk_org_id, r.probability, r.impact
	          FROM mitigations m
	          JOIN risks r ON m.risk_id = r.id
	          WHERE r.status != 'assessment_draft' AND r.is_current = TRUE AND r.is_cycle_current = TRUE`
	var args []interface{}

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
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

// DashboardSummary returns KPI card data for a specific cycle (or all cycles if empty)
func (r *riskRepository) DashboardSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.DashboardSummary, error) {
	s := &entity.DashboardSummary{}
	scoreExpr := "r.inherent_score"
	var orgFilter string
	var orgArgs []interface{}
	if len(orgIDs) > 0 {
		orgFilter = " AND r.organization_id = ANY($%d)"
		orgArgs = []interface{}{orgIDs}
	}
	if cycle != "" {
		args := []interface{}{cycle}
		argIdx := 2
		q := "SELECT COUNT(*) FROM risks r WHERE r.status != 'assessment_draft' AND r.is_cycle_current = TRUE AND r.assessment_cycle = $1"
		if len(orgIDs) > 0 {
			q += fmt.Sprintf(orgFilter, argIdx)
			args = append(args, orgArgs...)
		}
		if err := r.pool.QueryRow(ctx, q, args...).Scan(&s.TotalRisks); err != nil {
			return nil, fmt.Errorf("count risks: %w", err)
		}
		args2 := []interface{}{cycle}
		q2 := fmt.Sprintf("SELECT COUNT(*) FROM risks r WHERE r.status != 'assessment_draft' AND r.is_cycle_current = TRUE AND r.assessment_cycle = $1 AND (%s) >= 15", scoreExpr)
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
		q := "SELECT COUNT(*) FROM risks r WHERE r.status != 'assessment_draft' AND r.is_current = TRUE"
		if len(orgIDs) > 0 {
			q += fmt.Sprintf(orgFilter, argIdx)
			args = append(args, orgArgs...)
		}
		if err := r.pool.QueryRow(ctx, q, args...).Scan(&s.TotalRisks); err != nil {
			return nil, fmt.Errorf("count risks: %w", err)
		}
		var args2 []interface{}
		q2 := fmt.Sprintf("SELECT COUNT(*) FROM risks r WHERE r.status != 'assessment_draft' AND r.is_current = TRUE AND (%s) >= 15", scoreExpr)
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
			"SELECT COUNT(*) FROM mitigations m JOIN risks r ON r.id = m.risk_id WHERE m.due_date < CURRENT_DATE AND r.organization_id = ANY($1)",
			orgIDs).Scan(&s.OverdueMitig)
		if err != nil {
			return nil, fmt.Errorf("count overdue: %w", err)
		}
	} else {
		err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM mitigations WHERE due_date < CURRENT_DATE").Scan(&s.OverdueMitig)
		if err != nil {
			return nil, fmt.Errorf("count overdue: %w", err)
		}
	}
	if len(orgIDs) > 0 {
		err := r.pool.QueryRow(ctx,
			"SELECT COUNT(*) FROM incidents WHERE created_at >= date_trunc('month', CURRENT_DATE) AND organization_id = ANY($1)",
			orgIDs).Scan(&s.IncidentsMonth)
		if err != nil {
			return nil, fmt.Errorf("count incidents: %w", err)
		}
	} else {
		err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM incidents WHERE created_at >= date_trunc('month', CURRENT_DATE)").Scan(&s.IncidentsMonth)
		if err != nil {
			return nil, fmt.Errorf("count incidents: %w", err)
		}
	}
	return s, nil
}

// DashboardCategoryCounts returns risk counts grouped by category for a specific cycle (or all cycles if empty)
func (r *riskRepository) DashboardCategoryCounts(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	var query string
	var args []interface{}
	scoreExpr := "r.inherent_score"
	if cycle != "" {
		query = fmt.Sprintf(`SELECT COALESCE(NULLIF(category, ''), 'uncategorized') as category,
		        COUNT(*) as count,
		        COUNT(*) FILTER (WHERE (%[1]s) < 5) as sangat_rendah,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 5 AND (%[1]s) < 10) as rendah,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 10 AND (%[1]s) < 15) as sedang,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 15 AND (%[1]s) < 20) as tinggi,
		        COUNT(*) FILTER (WHERE (%[1]s) >= 20) as ekstrem
		 FROM risks r
		 WHERE r.is_cycle_current = TRUE AND r.status = 'approved' AND r.assessment_cycle = $1`, scoreExpr)
		args = []interface{}{cycle}
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($2)"
			args = append(args, orgIDs)
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
		 WHERE r.is_current = TRUE AND r.status = 'approved'`, scoreExpr)
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($1)"
			args = append(args, orgIDs)
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

// HeatmapData returns risk distribution for the 5x5 heatmap for a specific cycle (or all cycles if empty)
func (r *riskRepository) HeatmapData(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.HeatmapCell, error) {
	var query string
	var args []interface{}
	if cycle != "" {
		query = `SELECT r.probability AS probability, r.impact AS impact, COUNT(*) as cnt
		 FROM risks r WHERE r.status IN ('assessment_in_review','approved') AND r.is_cycle_current = TRUE AND r.assessment_cycle = $1`
		args = []interface{}{cycle}
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($2)"
			args = append(args, orgIDs)
		}
		query += " GROUP BY 1, 2"
	} else {
		query = `SELECT r.probability AS probability, r.impact AS impact, COUNT(*) as cnt
		 FROM risks r WHERE r.status IN ('assessment_in_review','approved') AND r.is_current = TRUE`
		if len(orgIDs) > 0 {
			query += " AND r.organization_id = ANY($1)"
			args = append(args, orgIDs)
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

// TopRisks returns the highest-scoring risks for a specific cycle (or all cycles if empty)
func (r *riskRepository) TopRisks(ctx context.Context, cycle string, limit int, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	var query string
	var args []interface{}
	if cycle != "" {
		query = `SELECT r.id, r.code, r.title, r.category, r.probability, r.impact, r.inherent_score, r.nilai, r.status,
		        COALESCE(o.name, '') as org_name
		 FROM risks r LEFT JOIN organizations o ON r.organization_id = o.id
		 WHERE r.status IN ('assessment_in_review','approved') AND r.is_cycle_current = TRUE AND r.assessment_cycle = $1`
		args = []interface{}{cycle}
		argIdx := 2
		if len(orgIDs) > 0 {
			query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
			args = append(args, orgIDs)
			argIdx++
		}
		query += fmt.Sprintf(`
		 ORDER BY r.inherent_score DESC, r.created_at DESC
		 LIMIT $%d`, argIdx)
		args = append(args, limit)
	} else {
		query = `SELECT r.id, r.code, r.title, r.category, r.probability, r.impact, r.inherent_score, r.nilai, r.status,
		        COALESCE(o.name, '') as org_name
		 FROM risks r LEFT JOIN organizations o ON r.organization_id = o.id
		 WHERE r.status IN ('assessment_in_review','approved') AND r.is_current = TRUE`
		argIdx := 1
		if len(orgIDs) > 0 {
			query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
			args = append(args, orgIDs)
			argIdx++
		}
		query += fmt.Sprintf(`
		 ORDER BY r.inherent_score DESC, r.created_at DESC
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
		`SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, r.inherent_score,
		        r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score,
		        r.next_review_date::text, COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
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
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
			&risk.NextReviewDate, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
		); err != nil {
			return nil, fmt.Errorf("scan risk version: %w", err)
		}
		risks = append(risks, &risk)
	}
	return risks, nil
}

// ListCycleSnapshot returns approved risks for one assessment cycle including mitigations.
func (r *riskRepository) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	// Debug: check what cycles exist in DB
	var dbCycles []string
	cycleRows, err := r.pool.Query(ctx, "SELECT DISTINCT assessment_cycle FROM risks WHERE assessment_cycle IS NOT NULL ORDER BY assessment_cycle DESC LIMIT 10")
	if err == nil {
		defer cycleRows.Close()
		for cycleRows.Next() {
			var c string
			cycleRows.Scan(&c)
			dbCycles = append(dbCycles, c)
		}
	}

	log.Printf("[DEBUG] ListCycleSnapshot called with cycle=%q, orgIDs=%v, available_cycles=%v", cycle, orgIDs, dbCycles)

	query := `SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, r.inherent_score,
		        r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, r.target_score,
		        r.next_review_date::text, COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
		        r.review_started_at, r.review_submitted_at, r.review_approved_at,
		        r.created_at, r.updated_at,
		        COALESCE(o.name, '') AS org_name,
		        COALESCE(u.name, '') AS created_by_name
	 FROM risks r
	 LEFT JOIN organizations o ON r.organization_id = o.id
	 LEFT JOIN users u ON r.created_by = u.id
	 WHERE r.assessment_cycle = $1
	   AND r.status = 'approved'
	   AND r.is_cycle_current = TRUE`
	args := []interface{}{cycle}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
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
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore,
			&risk.NextReviewDate, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
		); err != nil {
			return nil, fmt.Errorf("scan cycle snapshot risk: %w", err)
		}
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
		`SELECT id, risk_id, action, owner, owner_user_id, due_date::text, frequency, recurring_interval, report_day, report_date, COALESCE(execution_schedule_text, ''), target_cost, sort_order, created_at
		 FROM mitigations
		 WHERE risk_id = ANY($1)
		 ORDER BY risk_id, sort_order, created_at`, riskIDs)
	if err != nil {
		return nil, fmt.Errorf("load cycle snapshot mitigations: %w", err)
	}
	defer mitigationRows.Close()

	for mitigationRows.Next() {
		var mitigation entity.Mitigation
		if err := mitigationRows.Scan(&mitigation.ID, &mitigation.RiskID, &mitigation.Action, &mitigation.Owner, &mitigation.OwnerUserID, &mitigation.DueDate, &mitigation.Frequency, &mitigation.RecurringInterval, &mitigation.ReportDay, &mitigation.ReportDate, &mitigation.ExecutionScheduleText, &mitigation.TargetCost, &mitigation.SortOrder, &mitigation.CreatedAt); err != nil {
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

// ActivateApprovedVersion marks a newly approved version as current and archives the prior one.
func (r *riskRepository) ActivateApprovedVersion(ctx context.Context, approvedRiskID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin activate approved version: %w", err)
	}
	defer tx.Rollback(ctx)

	var versionGroupID uuid.UUID
	var assessmentCycle string
	var nextReviewDate *time.Time
	if err := tx.QueryRow(ctx,
		`SELECT version_group_id, COALESCE(assessment_cycle, ''), next_review_date FROM risks WHERE id = $1`, approvedRiskID,
	).Scan(&versionGroupID, &assessmentCycle, &nextReviewDate); err != nil {
		return fmt.Errorf("load approved risk for activation: %w", err)
	}

	if _, err := tx.Exec(ctx,
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
		if _, err := tx.Exec(ctx,
			`UPDATE risks
			 SET is_cycle_current = FALSE
			 WHERE version_group_id = $1 AND assessment_cycle = $2 AND is_cycle_current = TRUE AND id <> $3`,
			versionGroupID, assessmentCycle, approvedRiskID,
		); err != nil {
			return fmt.Errorf("unset previous cycle current: %w", err)
		}
	}

	var newNextReviewDate *time.Time
	if nextReviewDate != nil {
		next := nextReviewDate.AddDate(0, 6, 0)
		newNextReviewDate = &next
	}

	if _, err := tx.Exec(ctx,
		`UPDATE risks
		 SET is_current = TRUE,
		     is_cycle_current = TRUE,
		     status = 'approved',
		     review_approved_at = now(),
		     next_review_date = COALESCE($2, next_review_date),
		     updated_at = now()
		 WHERE id = $1`, approvedRiskID, newNextReviewDate,
	); err != nil {
		return fmt.Errorf("activate approved risk version: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit activate approved version: %w", err)
	}
	return nil
}

// ListReviewQueue returns current risks and their reassessment progress for a cycle.
// page=0 and limit=0 disables pagination, returning all rows.
func (r *riskRepository) ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string, search string, page int, limit int) ([]*entity.RiskReviewQueueItem, int, error) {
	currentScoreExpr := "base.inherent_score"
	candidateScoreExpr := "candidate.inherent_score"

	baseFrom := `FROM risks base
	LEFT JOIN organizations org ON org.id = base.organization_id
	LEFT JOIN LATERAL (
		SELECT c.id, c.status, c.inherent_score, c.probability, c.impact, c.weight, c.nilai, c.change_reason, c.review_summary, c.updated_at
		FROM risks c
		WHERE c.version_group_id = base.version_group_id
		  AND c.assessment_cycle = $1
		ORDER BY c.created_at DESC
		LIMIT 1
	) candidate ON TRUE
	WHERE base.is_current = TRUE AND base.status = 'approved'`

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
				WHEN base.assessment_cycle = $1 THEN 'approved'
				WHEN candidate.id IS NULL AND base.next_review_date IS NOT NULL AND base.next_review_date::date < CURRENT_DATE THEN 'overdue'
				WHEN candidate.id IS NULL THEN 'due'
				WHEN candidate.status = 'assessment_draft' THEN 'in_draft'
				WHEN candidate.status = 'assessment_in_review' THEN 'in_review'
				WHEN candidate.status = 'approved' THEN 'approved'
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
			OR COALESCE(candidate.change_reason, '') ILIKE '%%' || $%[1]d || '%%'
			OR COALESCE(candidate.review_summary, '') ILIKE '%%' || $%[1]d || '%%'
		)`, len(args)+1)
		args = append(args, search)
	}

	countQuery := "SELECT COUNT(*) " + baseFrom
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk review queue: %w", err)
	}

	query := fmt.Sprintf(`SELECT
		base.id::text,
		base.version_group_id::text,
		base.code,
		base.title,
		COALESCE(org.name, '') AS org_name,
		base.status,
		CASE
			WHEN base.assessment_cycle = $1 THEN 'approved'
			WHEN candidate.id IS NULL AND base.next_review_date IS NOT NULL AND base.next_review_date::date < CURRENT_DATE THEN 'overdue'
			WHEN candidate.id IS NULL THEN 'due'
			WHEN candidate.status = 'assessment_draft' THEN 'in_draft'
			WHEN candidate.status = 'assessment_in_review' THEN 'in_review'
			WHEN candidate.status = 'approved' THEN 'approved'
			ELSE 'due'
		END AS review_status,
		$1 AS assessment_cycle,
		(%[1]s) AS current_score,
		CASE
			WHEN (%[1]s) >= 20 THEN 'extreme'
			WHEN (%[1]s) >= 15 THEN 'high'
			WHEN (%[1]s) >= 10 THEN 'medium'
			WHEN (%[1]s) >= 5 THEN 'low'
			ELSE 'very_low'
		END AS current_level,
		candidate.id::text,
		candidate.status,
		(%[2]s) AS candidate_score,
		CASE
			WHEN candidate.id IS NULL THEN NULL
			WHEN (%[2]s) >= 20 THEN 'extreme'
			WHEN (%[2]s) >= 15 THEN 'high'
			WHEN (%[2]s) >= 10 THEN 'medium'
			WHEN (%[2]s) >= 5 THEN 'low'
			ELSE 'very_low'
		END AS candidate_level,
		base.next_review_date::text,
		COALESCE(candidate.change_reason, ''),
		COALESCE(candidate.review_summary, ''),
		candidate.updated_at::text
	`, currentScoreExpr, candidateScoreExpr) + baseFrom + " ORDER BY base.next_review_date NULLS LAST, base.updated_at DESC"

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
	prevScore := "prev.inherent_score"
	currScore := "curr.inherent_score"

	cteQuery := fmt.Sprintf(`WITH scored AS (
		SELECT
			curr.version_group_id,
			curr.code,
			curr.title,
			COALESCE(org.name, '') AS org_name,
			(%s) AS prev_score,
			(%s) AS curr_score,
			COALESCE(curr.change_reason, '') AS change_reason
		FROM risks curr
		JOIN risks prev ON prev.id = curr.previous_risk_id
		LEFT JOIN organizations org ON org.id = curr.organization_id
		WHERE curr.assessment_cycle = $2
		  AND curr.status = 'approved'
		  AND curr.is_cycle_current = TRUE
		  AND prev.assessment_cycle = $1
		  AND prev.status = 'approved'
		  AND prev.is_cycle_current = TRUE`, prevScore, currScore)

	args := []interface{}{fromCycle, toCycle}
	if len(orgIDs) > 0 {
		cteQuery += fmt.Sprintf(" AND curr.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
	}

	query := cteQuery + `)
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
	if parts[1] == "H1" {
		return fmt.Sprintf("%d-H2", year-1)
	}
	return fmt.Sprintf("%d-H1", year)
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
		case "approved":
			summary.Completed++
			unit.Completed++
		case "pending_approval":
			summary.PendingApproval++
			unit.Pending++
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
		query := `SELECT r.probability AS probability, r.impact AS impact, COUNT(*) as cnt FROM risks r WHERE r.assessment_cycle = $1 AND r.status = 'approved' AND r.is_cycle_current = TRUE`
		args := []interface{}{targetCycle}
		if len(orgIDs) > 0 {
			query += fmt.Sprintf(" AND organization_id = ANY($%d)", len(args)+1)
			args = append(args, orgIDs)
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
	WITH cycle_compare AS (
		SELECT
			curr.probability AS probability,
			curr.impact AS impact,
			CASE
				WHEN prev.inherent_score IS NULL THEN 'new'
				WHEN curr.inherent_score > prev.inherent_score THEN 'up'
				WHEN curr.inherent_score < prev.inherent_score THEN 'down'
				ELSE 'stable'
			END AS movement
		FROM risks curr
		LEFT JOIN risks prev ON prev.version_group_id = curr.version_group_id
			AND prev.assessment_cycle = $1
			AND prev.status = 'approved'
			AND prev.is_cycle_current = TRUE
		WHERE curr.assessment_cycle = $2
			AND curr.status = 'approved'
			AND curr.is_cycle_current = TRUE
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
	WITH cycle_compare AS (
		SELECT
			curr.probability AS probability,
			curr.impact AS impact,
			CASE
				WHEN prev.inherent_score IS NULL THEN 'new'
				WHEN curr.inherent_score > prev.inherent_score THEN 'up'
				WHEN curr.inherent_score < prev.inherent_score THEN 'down'
				ELSE 'stable'
			END AS movement
		FROM risks curr
		LEFT JOIN risks prev ON prev.version_group_id = curr.version_group_id
			AND prev.assessment_cycle = $1
			AND prev.status = 'approved'
			AND prev.is_cycle_current = TRUE
		WHERE curr.assessment_cycle = $2
			AND curr.status = 'approved'
			AND curr.is_cycle_current = TRUE
			AND curr.organization_id = ANY($3)
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
		args = append(args, orgIDs)
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
		args = append(args, orgIDs)
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

func (r *riskRepository) GetKRIBreachSummary(ctx context.Context, orgIDs []uuid.UUID) ([]entity.KRIBreachItem, error) {
	query := `
	SELECT
		k.id::text AS kri_id,
		k.name AS kri_name,
		k.threshold_max AS threshold,
		k.current_value AS actual_value,
		COALESCE(k.metric, '') AS unit,
		CASE
			WHEN k.direction = 'higher_worse' THEN
				CASE
					WHEN k.current_value > k.threshold_max THEN 'breach'
					WHEN k.current_value >= k.threshold_max * 0.8 THEN 'warning'
					ELSE 'safe'
				END
			WHEN k.direction = 'lower_worse' THEN
				CASE
					WHEN k.current_value < k.threshold_min THEN 'breach'
					WHEN k.current_value <= k.threshold_min * 1.2 THEN 'warning'
					ELSE 'safe'
				END
			ELSE 'safe'
		END AS status,
		COALESCE(r.title, '') AS risk_title,
		COALESCE(org.name, '') AS org_name
	FROM kris k
	LEFT JOIN risks r ON r.id = k.risk_id
	LEFT JOIN organizations org ON org.id = k.organization_id
	WHERE k.is_archived = FALSE
	  AND (
	    (k.direction = 'higher_worse' AND k.current_value >= k.threshold_max * 0.8)
	    OR (k.direction = 'lower_worse' AND k.current_value <= k.threshold_min * 1.2)
	  )`
	args := []interface{}{}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND k.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
	}
	query += `
	ORDER BY
		CASE
			WHEN k.direction = 'higher_worse' AND k.current_value > k.threshold_max THEN 0
			WHEN k.direction = 'lower_worse' AND k.current_value < k.threshold_min THEN 0
			ELSE 1
		END,
		k.name ASC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("kri breach summary: %w", err)
	}
	defer rows.Close()

	items := make([]entity.KRIBreachItem, 0)
	for rows.Next() {
		var item entity.KRIBreachItem
		if err := rows.Scan(
			&item.KRIID, &item.KRIName, &item.Threshold, &item.ActualValue,
			&item.Unit, &item.Status, &item.RiskTitle, &item.OrgName,
		); err != nil {
			return nil, fmt.Errorf("scan kri breach: %w", err)
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
		args = append(args, orgIDs)
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
