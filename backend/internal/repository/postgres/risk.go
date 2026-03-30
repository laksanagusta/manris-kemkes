package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// riskRepository is the PostgreSQL implementation of repository.RiskRepository
type riskRepository struct {
	pool *pgxpool.Pool
}

// NewRiskRepository creates a new risk repository
func NewRiskRepository(pool *pgxpool.Pool) repository.RiskRepository {
	return &riskRepository{pool: pool}
}

// Create inserts a new risk and its mitigations
func (r *riskRepository) Create(ctx context.Context, risk *entity.Risk) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO risks (code, title, description, status, organization_id, created_by,
		  cause, risk_source, controllability, impact_description,
		  existing_control, control_effectiveness, probability, impact, weight,
		  risk_priority, risk_appetite, treatment_option,
		  target_probability, target_impact, target_weight, next_review_date)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
		 RETURNING id, inherent_score, target_score, created_at, updated_at`,
		risk.Code, risk.Title, risk.Description, risk.Status, risk.OrganizationID, risk.CreatedBy,
		risk.Cause, risk.RiskSource, risk.Controllability, risk.ImpactDesc,
		risk.ExistingControl, risk.ControlEffectiveness, risk.Probability, risk.Impact, risk.Weight,
		risk.RiskPriority, risk.RiskAppetite, risk.TreatmentOption,
		risk.TargetProbability, risk.TargetImpact, risk.TargetWeight, risk.NextReviewDate,
	).Scan(&risk.ID, &risk.InherentScore, &risk.TargetScore, &risk.CreatedAt, &risk.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create risk: %w", err)
	}

	// Insert mitigations
	for i, m := range risk.Mitigations {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO mitigations (risk_id, action, owner, owner_user_id, due_date, frequency, recurring_interval, report_day, report_date, target_cost, sort_order)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			risk.ID, m.Action, m.Owner, m.OwnerUserID, m.DueDate, m.Frequency, m.RecurringInterval, m.ReportDay, m.ReportDate, m.TargetCost, i+1)
		if err != nil {
			return fmt.Errorf("create mitigation: %w", err)
		}
	}
	return nil
}

// GetByID retrieves a risk by ID including mitigations
func (r *riskRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Risk, error) {
	risk := &entity.Risk{}
	err := r.pool.QueryRow(ctx,
		`SELECT r.id, r.code, r.title, r.description, r.status, r.organization_id, r.created_by,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.inherent_score,
		        r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_score,
		        r.next_review_date::text,
		        r.created_at, r.updated_at,
		        COALESCE(o.name, '') as org_name,
		        COALESCE(u.name, '') as created_by_name
		 FROM risks r
		 LEFT JOIN organizations o ON r.organization_id = o.id
		 LEFT JOIN users u ON r.created_by = u.id
		 WHERE r.id = $1`, id,
	).Scan(
		&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Status, &risk.OrganizationID, &risk.CreatedBy,
		&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
		&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.InherentScore,
		&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
		&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetScore,
		&risk.NextReviewDate,
		&risk.CreatedAt, &risk.UpdatedAt,
		&risk.OrgName, &risk.CreatedByName,
	)
	if err != nil {
		return nil, fmt.Errorf("find risk by id: %w", err)
	}

	// Load mitigations
	mRows, err := r.pool.Query(ctx,
		`SELECT id, risk_id, action, owner, owner_user_id, due_date::text, frequency, recurring_interval, report_day, report_date, target_cost, sort_order, created_at
		 FROM mitigations WHERE risk_id = $1 ORDER BY sort_order`, id)
	if err != nil {
		return nil, fmt.Errorf("load mitigations: %w", err)
	}
	defer mRows.Close()

	for mRows.Next() {
		var m entity.Mitigation
		if err := mRows.Scan(&m.ID, &m.RiskID, &m.Action, &m.Owner, &m.OwnerUserID, &m.DueDate, &m.Frequency, &m.RecurringInterval, &m.ReportDay, &m.ReportDate, &m.TargetCost, &m.SortOrder, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan mitigation: %w", err)
		}
		risk.Mitigations = append(risk.Mitigations, m)
	}

	return risk, nil
}

// Update updates an existing risk and replaces its mitigations
func (r *riskRepository) Update(ctx context.Context, risk *entity.Risk) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE risks SET code=$2, title=$3, description=$4, status=$5, organization_id=$6,
		  cause=$7, risk_source=$8, controllability=$9, impact_description=$10,
		  existing_control=$11, control_effectiveness=$12, probability=$13, impact=$14, weight=$15,
		  risk_priority=$16, risk_appetite=$17, treatment_option=$18,
		  target_probability=$19, target_impact=$20, target_weight=$21, next_review_date=$22,
		  updated_at=now()
		 WHERE id=$1`,
		risk.ID, risk.Code, risk.Title, risk.Description, risk.Status, risk.OrganizationID,
		risk.Cause, risk.RiskSource, risk.Controllability, risk.ImpactDesc,
		risk.ExistingControl, risk.ControlEffectiveness, risk.Probability, risk.Impact, risk.Weight,
		risk.RiskPriority, risk.RiskAppetite, risk.TreatmentOption,
		risk.TargetProbability, risk.TargetImpact, risk.TargetWeight, risk.NextReviewDate,
	)
	if err != nil {
		return fmt.Errorf("update risk: %w", err)
	}

	// Replace mitigations
	_, _ = r.pool.Exec(ctx, "DELETE FROM mitigations WHERE risk_id = $1", risk.ID)
	for i, m := range risk.Mitigations {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO mitigations (risk_id, action, owner, owner_user_id, due_date, frequency, recurring_interval, report_day, report_date, target_cost, sort_order)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			risk.ID, m.Action, m.Owner, m.OwnerUserID, m.DueDate, m.Frequency, m.RecurringInterval, m.ReportDay, m.ReportDate, m.TargetCost, i+1)
		if err != nil {
			return fmt.Errorf("upsert mitigation: %w", err)
		}
	}
	return nil
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
func (r *riskRepository) List(ctx context.Context, orgID *uuid.UUID, status string) ([]*entity.Risk, error) {
	query := `SELECT r.id, r.code, r.title, r.description, r.status, r.organization_id, r.created_by,
	                  r.cause, r.risk_source, r.controllability, r.impact_description,
	                  r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.inherent_score,
	                  r.risk_priority, r.risk_appetite, r.treatment_option,
	                  r.target_probability, r.target_impact, r.target_weight, r.target_score,
	                  r.next_review_date::text,
	                  r.created_at, r.updated_at,
	                  COALESCE(o.name, '') as org_name,
	                  COALESCE(u.name, '') as created_by_name
	           FROM risks r
	           LEFT JOIN organizations o ON r.organization_id = o.id
	           LEFT JOIN users u ON r.created_by = u.id
	           WHERE 1=1`
	var args []interface{}
	argIdx := 1

	if orgID != nil {
		query += fmt.Sprintf(" AND r.organization_id = $%d", argIdx)
		args = append(args, orgID)
		argIdx++
	}
	if status != "" && status != "all" {
		query += fmt.Sprintf(" AND r.status = $%d", argIdx)
		args = append(args, status)
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
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Status, &risk.OrganizationID, &risk.CreatedBy,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetScore,
			&risk.NextReviewDate,
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
func (r *riskRepository) ListMitigations(ctx context.Context, orgID *uuid.UUID) ([]*entity.MitigationAssoc, error) {
	query := `SELECT m.id, m.risk_id, m.action, m.owner, m.owner_user_id, m.due_date::text, m.frequency, m.recurring_interval, m.target_cost, m.sort_order, m.created_at,
	                 r.code as risk_code, r.title as risk_title, r.organization_id as risk_org_id, r.probability, r.impact
	          FROM mitigations m
	          JOIN risks r ON m.risk_id = r.id
	          WHERE r.status != 'draft'`
	var args []interface{}

	if orgID != nil {
		query += ` AND r.organization_id = $1`
		args = append(args, orgID)
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

// DashboardSummary returns KPI card data
func (r *riskRepository) DashboardSummary(ctx context.Context) (*entity.DashboardSummary, error) {
	s := &entity.DashboardSummary{}
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM risks WHERE status != 'draft'").Scan(&s.TotalRisks)
	if err != nil {
		return nil, fmt.Errorf("count risks: %w", err)
	}
	err = r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM risks WHERE status != 'draft' AND (probability * impact) >= 10").Scan(&s.HighExtreme)
	if err != nil {
		return nil, fmt.Errorf("count high/extreme: %w", err)
	}
	err = r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM mitigations WHERE due_date < CURRENT_DATE").Scan(&s.OverdueMitig)
	if err != nil {
		return nil, fmt.Errorf("count overdue: %w", err)
	}
	err = r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM incidents WHERE created_at >= date_trunc('month', CURRENT_DATE)").Scan(&s.IncidentsMonth)
	if err != nil {
		return nil, fmt.Errorf("count incidents: %w", err)
	}
	return s, nil
}

// HeatmapData returns risk distribution for the 5x5 heatmap
func (r *riskRepository) HeatmapData(ctx context.Context) ([]*entity.HeatmapCell, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT probability, impact, COUNT(*) as cnt
		 FROM risks WHERE status IN ('final','approved')
		 GROUP BY probability, impact`)
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

// TopRisks returns the highest-scoring risks
func (r *riskRepository) TopRisks(ctx context.Context, limit int) ([]*entity.Risk, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT r.id, r.code, r.title, r.probability, r.impact, r.inherent_score, r.status,
		        COALESCE(o.name, '') as org_name
		 FROM risks r LEFT JOIN organizations o ON r.organization_id = o.id
		 WHERE r.status IN ('final','approved')
		 ORDER BY r.inherent_score DESC, r.created_at DESC
		 LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("top risks: %w", err)
	}
	defer rows.Close()

	var risks []*entity.Risk
	for rows.Next() {
		var risk entity.Risk
		if err := rows.Scan(&risk.ID, &risk.Code, &risk.Title, &risk.Probability, &risk.Impact, &risk.InherentScore, &risk.Status, &risk.OrgName); err != nil {
			return nil, fmt.Errorf("scan top risk: %w", err)
		}
		risks = append(risks, &risk)
	}
	return risks, nil
}
