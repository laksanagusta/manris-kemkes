package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type mitigationTaskRepository struct {
	pool *pgxpool.Pool
}

func NewMitigationTaskRepository(pool *pgxpool.Pool) repository.MitigationTaskRepository {
	return &mitigationTaskRepository{pool: pool}
}

func (r *mitigationTaskRepository) Create(ctx context.Context, task *entity.MitigationTask) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO mitigation_tasks 
		 (mitigation_id, risk_id, period_label, period_start, period_end, due_date, status, generated_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING id, created_at, updated_at`,
		task.MitigationID, task.RiskID, task.PeriodLabel, task.PeriodStart, task.PeriodEnd,
		task.DueDate, task.Status, task.GeneratedBy,
	).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create mitigation task: %w", err)
	}
	return nil
}

func (r *mitigationTaskRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MitigationTask, error) {
	task := &entity.MitigationTask{}
	err := r.pool.QueryRow(ctx,
		`SELECT t.id, t.mitigation_id, t.risk_id,
		        t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
		        t.status, t.progress_pct, t.actual_cost, t.evidence_url, t.notes,
		        t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
		        m.action, m.owner,
		        COALESCE(r.code, '') as risk_code, COALESCE(r.title, '') as risk_title,
		        COALESCE(u.name, '') as reported_by_name
		 FROM mitigation_tasks t
		 JOIN mitigations m ON t.mitigation_id = m.id
		 JOIN risks r ON t.risk_id = r.id
		 LEFT JOIN users u ON t.reported_by = u.id
		 WHERE t.id = $1 AND (cardinality($2::uuid[]) = 0 OR r.organization_id = ANY($2::uuid[]))`, id, orgIDs,
	).Scan(
		&task.ID, &task.MitigationID, &task.RiskID,
		&task.PeriodLabel, &task.PeriodStart, &task.PeriodEnd, &task.DueDate,
		&task.Status, &task.ProgressPct, &task.ActualCost, &task.EvidenceURL, &task.Notes,
		&task.ReportedBy, &task.ReportedAt, &task.GeneratedBy, &task.CreatedAt, &task.UpdatedAt,
		&task.MitigationAction, &task.MitigationOwner,
		&task.RiskCode, &task.RiskTitle,
		&task.ReportedByName,
	)
	if err != nil {
		return nil, fmt.Errorf("get mitigation task: %w", err)
	}
	return task, nil
}

func (r *mitigationTaskRepository) Update(ctx context.Context, task *entity.MitigationTask) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE mitigation_tasks SET
		 status=$2, progress_pct=$3, actual_cost=$4, evidence_url=$5, notes=$6,
		 reported_by=$7, reported_at=$8, updated_at=now()
		 WHERE id=$1`,
		task.ID, task.Status, task.ProgressPct, task.ActualCost, task.EvidenceURL, task.Notes,
		task.ReportedBy, task.ReportedAt,
	)
	if err != nil {
		return fmt.Errorf("update mitigation task: %w", err)
	}
	return nil
}

func (r *mitigationTaskRepository) ListByRisk(ctx context.Context, riskID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	return r.queryTasks(ctx,
		`SELECT t.id, t.mitigation_id, t.risk_id,
		        t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
		        t.status, t.progress_pct, t.actual_cost, t.evidence_url, t.notes,
		        t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
		        m.action, m.owner,
		        COALESCE(r.code, ''), COALESCE(r.title, ''),
		        COALESCE(u.name, '')
		 FROM mitigation_tasks t
		 JOIN mitigations m ON t.mitigation_id = m.id
		 JOIN risks r ON t.risk_id = r.id
		 LEFT JOIN users u ON t.reported_by = u.id
		 WHERE t.risk_id = $1 AND (cardinality($2::uuid[]) = 0 OR r.organization_id = ANY($2::uuid[]))
		 ORDER BY t.due_date DESC`, riskID, orgIDs)
}

func (r *mitigationTaskRepository) ListByMitigation(ctx context.Context, mitigationID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	return r.queryTasks(ctx,
		`SELECT t.id, t.mitigation_id, t.risk_id,
		        t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
		        t.status, t.progress_pct, t.actual_cost, t.evidence_url, t.notes,
		        t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
		        m.action, m.owner,
		        COALESCE(r.code, ''), COALESCE(r.title, ''),
		        COALESCE(u.name, '')
		 FROM mitigation_tasks t
		 JOIN mitigations m ON t.mitigation_id = m.id
		 JOIN risks r ON t.risk_id = r.id
		 LEFT JOIN users u ON t.reported_by = u.id
		 WHERE t.mitigation_id = $1 AND (cardinality($2::uuid[]) = 0 OR r.organization_id = ANY($2::uuid[]))
		 ORDER BY t.due_date DESC`, mitigationID, orgIDs)
}

func (r *mitigationTaskRepository) ListByUser(ctx context.Context, userID uuid.UUID, status string, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	query := `SELECT t.id, t.mitigation_id, t.risk_id,
		        t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
		        t.status, t.progress_pct, t.actual_cost, t.evidence_url, t.notes,
		        t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
		        m.action, m.owner,
		        COALESCE(r.code, ''), COALESCE(r.title, ''),
		        COALESCE(u.name, '')
		 FROM mitigation_tasks t
		 JOIN mitigations m ON t.mitigation_id = m.id
		 JOIN risks r ON t.risk_id = r.id
		 LEFT JOIN users u ON t.reported_by = u.id
		 WHERE m.owner_user_id = $1 AND (cardinality($2::uuid[]) = 0 OR r.organization_id = ANY($2::uuid[]))`

	args := []interface{}{userID, orgIDs}
	if status != "" && status != "all" {
		query += ` AND t.status = $3`
		args = append(args, status)
	}
	query += ` ORDER BY t.due_date ASC`

	return r.queryTasks(ctx, query, args...)
}

func (r *mitigationTaskRepository) ListPendingOverdue(ctx context.Context, refDate time.Time) ([]*entity.MitigationTask, error) {
	return r.queryTasks(ctx,
		`SELECT t.id, t.mitigation_id, t.risk_id,
		        t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
		        t.status, t.progress_pct, t.actual_cost, t.evidence_url, t.notes,
		        t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
		        m.action, m.owner,
		        COALESCE(r.code, ''), COALESCE(r.title, ''),
		        COALESCE(u.name, '')
		 FROM mitigation_tasks t
		 JOIN mitigations m ON t.mitigation_id = m.id
		 JOIN risks r ON t.risk_id = r.id
		 LEFT JOIN users u ON t.reported_by = u.id
		 WHERE t.status = 'pending' AND t.due_date < $1
		 ORDER BY t.due_date ASC`, refDate.Format("2006-01-02"))
}

func (r *mitigationTaskRepository) GetRecurringMitigations(ctx context.Context) ([]*entity.Mitigation, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT m.id, m.risk_id, m.action, m.owner, m.owner_user_id, m.due_date::text,
		        m.frequency, m.recurring_interval, m.report_day, m.report_date,
		        m.target_cost, m.sort_order, m.created_at
		 FROM mitigations m
		 JOIN risks r ON m.risk_id = r.id
		 WHERE m.frequency = 'rutin'
		   AND m.recurring_interval IS NOT NULL
		   AND r.status IN ('in_approval','approved')
		   AND r.is_current = TRUE
		   AND r.is_cycle_current = TRUE`)
	if err != nil {
		return nil, fmt.Errorf("get recurring mitigations: %w", err)
	}
	defer rows.Close()

	var result []*entity.Mitigation
	for rows.Next() {
		var m entity.Mitigation
		if err := rows.Scan(
			&m.ID, &m.RiskID, &m.Action, &m.Owner, &m.OwnerUserID, &m.DueDate,
			&m.Frequency, &m.RecurringInterval, &m.ReportDay, &m.ReportDate,
			&m.TargetCost, &m.SortOrder, &m.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan recurring mitigation: %w", err)
		}
		result = append(result, &m)
	}
	return result, nil
}

func (r *mitigationTaskRepository) ListAll(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	baseQuery := `SELECT t.id, t.mitigation_id, t.risk_id,
		        t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
		        t.status, t.progress_pct, t.actual_cost, t.evidence_url, t.notes,
		        t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
		        m.action, m.owner,
		        COALESCE(r.code, ''), COALESCE(r.title, ''),
		        COALESCE(u.name, '')
		 FROM mitigation_tasks t
		 JOIN mitigations m ON t.mitigation_id = m.id
		 JOIN risks r ON t.risk_id = r.id
		 LEFT JOIN users u ON t.reported_by = u.id`

	if len(orgIDs) > 0 {
		return r.queryTasks(ctx, baseQuery+" WHERE r.organization_id = ANY($1) ORDER BY t.due_date DESC", orgIDs)
	}
	return r.queryTasks(ctx, baseQuery+" ORDER BY t.due_date DESC")
}

func (r *mitigationTaskRepository) TaskExistsForPeriod(ctx context.Context, mitigationID uuid.UUID, periodStart, periodEnd string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(
		   SELECT 1 FROM mitigation_tasks 
		   WHERE mitigation_id = $1 AND period_start = $2 AND period_end = $3
		 )`, mitigationID, periodStart, periodEnd,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check task exists: %w", err)
	}
	return exists, nil
}

// queryTasks is a shared helper to scan task rows
func (r *mitigationTaskRepository) queryTasks(ctx context.Context, query string, args ...interface{}) ([]*entity.MitigationTask, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*entity.MitigationTask
	for rows.Next() {
		var t entity.MitigationTask
		if err := rows.Scan(
			&t.ID, &t.MitigationID, &t.RiskID,
			&t.PeriodLabel, &t.PeriodStart, &t.PeriodEnd, &t.DueDate,
			&t.Status, &t.ProgressPct, &t.ActualCost, &t.EvidenceURL, &t.Notes,
			&t.ReportedBy, &t.ReportedAt, &t.GeneratedBy, &t.CreatedAt, &t.UpdatedAt,
			&t.MitigationAction, &t.MitigationOwner,
			&t.RiskCode, &t.RiskTitle,
			&t.ReportedByName,
		); err != nil {
			return nil, fmt.Errorf("scan task: %w", err)
		}
		tasks = append(tasks, &t)
	}
	return tasks, nil
}
