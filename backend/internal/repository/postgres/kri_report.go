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

type kriReportRepository struct {
	pool *pgxpool.Pool
}

func NewKRIReportRepository(pool *pgxpool.Pool) repository.KRIReportRepository {
	return &kriReportRepository{pool: pool}
}

func (r *kriReportRepository) Create(ctx context.Context, report *entity.KRIReport) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO kri_reports
		 (kri_id, period_label, period_start, period_end, due_date, status, generated_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 RETURNING id, created_at, updated_at`,
		report.KRIID, report.PeriodLabel, report.PeriodStart, report.PeriodEnd,
		report.DueDate, report.Status, report.GeneratedBy,
	).Scan(&report.ID, &report.CreatedAt, &report.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create kri report: %w", err)
	}
	return nil
}

func (r *kriReportRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.KRIReport, error) {
	rpt := &entity.KRIReport{}
	err := r.pool.QueryRow(ctx,
		`SELECT rp.id, rp.kri_id,
		        rp.period_label, TO_CHAR(rp.period_start, 'YYYY-MM-DD'), TO_CHAR(rp.period_end, 'YYYY-MM-DD'), TO_CHAR(rp.due_date, 'YYYY-MM-DD'),
		        rp.value, rp.notes, rp.status,
		        rp.submitted_by, rp.submitted_at, rp.generated_by,
		        rp.created_at, rp.updated_at,
		        COALESCE(k.name, '') as kri_name,
		        COALESCE(k.metric, '') as kri_metric,
		        COALESCE(rs.code, '') as risk_code,
		        COALESCE(rs.title, '') as risk_title,
		        COALESCE(u.name, '') as submitted_by_name
		 FROM kri_reports rp
		 JOIN kris k ON rp.kri_id = k.id
		 LEFT JOIN risks rs ON k.risk_id = rs.id
		 LEFT JOIN users u ON rp.submitted_by = u.id
		 WHERE rp.id = $1`, id,
	).Scan(
		&rpt.ID, &rpt.KRIID,
		&rpt.PeriodLabel, &rpt.PeriodStart, &rpt.PeriodEnd, &rpt.DueDate,
		&rpt.Value, &rpt.Notes, &rpt.Status,
		&rpt.SubmittedBy, &rpt.SubmittedAt, &rpt.GeneratedBy,
		&rpt.CreatedAt, &rpt.UpdatedAt,
		&rpt.KRIName, &rpt.KRIMetric,
		&rpt.RiskCode, &rpt.RiskTitle,
		&rpt.SubmittedByName,
	)
	if err != nil {
		return nil, fmt.Errorf("get kri report: %w", err)
	}
	return rpt, nil
}

func (r *kriReportRepository) Update(ctx context.Context, report *entity.KRIReport) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE kri_reports SET
		 value=$2, notes=$3, status=$4,
		 submitted_by=$5, submitted_at=$6, updated_at=now()
		 WHERE id=$1`,
		report.ID, report.Value, report.Notes, report.Status,
		report.SubmittedBy, report.SubmittedAt,
	)
	if err != nil {
		return fmt.Errorf("update kri report: %w", err)
	}
	return nil
}

func (r *kriReportRepository) ListByKRI(ctx context.Context, kriID uuid.UUID) ([]*entity.KRIReport, error) {
	return r.queryReports(ctx,
		`SELECT rp.id, rp.kri_id,
		        rp.period_label, TO_CHAR(rp.period_start, 'YYYY-MM-DD'), TO_CHAR(rp.period_end, 'YYYY-MM-DD'), TO_CHAR(rp.due_date, 'YYYY-MM-DD'),
		        rp.value, rp.notes, rp.status,
		        rp.submitted_by, rp.submitted_at, rp.generated_by,
		        rp.created_at, rp.updated_at,
		        COALESCE(k.name, ''), COALESCE(k.metric, ''),
		        COALESCE(rs.code, ''), COALESCE(rs.title, ''),
		        COALESCE(u.name, '')
		 FROM kri_reports rp
		 JOIN kris k ON rp.kri_id = k.id
		 LEFT JOIN risks rs ON k.risk_id = rs.id
		 LEFT JOIN users u ON rp.submitted_by = u.id
		 WHERE rp.kri_id = $1
		 ORDER BY rp.due_date DESC`, kriID)
}

func (r *kriReportRepository) ListByUser(ctx context.Context, userID uuid.UUID, status string) ([]*entity.KRIReport, error) {
	query := `SELECT rp.id, rp.kri_id,
		        rp.period_label, TO_CHAR(rp.period_start, 'YYYY-MM-DD'), TO_CHAR(rp.period_end, 'YYYY-MM-DD'), TO_CHAR(rp.due_date, 'YYYY-MM-DD'),
		        rp.value, rp.notes, rp.status,
		        rp.submitted_by, rp.submitted_at, rp.generated_by,
		        rp.created_at, rp.updated_at,
		        COALESCE(k.name, ''), COALESCE(k.metric, ''),
		        COALESCE(rs.code, ''), COALESCE(rs.title, ''),
		        COALESCE(u.name, '')
		 FROM kri_reports rp
		 JOIN kris k ON rp.kri_id = k.id
		 LEFT JOIN risks rs ON k.risk_id = rs.id
		 LEFT JOIN users u ON rp.submitted_by = u.id
		 WHERE 1=1`

	args := []interface{}{}
	argIdx := 1

	if status != "" && status != "all" {
		query += fmt.Sprintf(` AND rp.status = $%d`, argIdx)
		args = append(args, status)
		argIdx++
	}

	query += ` ORDER BY rp.due_date ASC`

	return r.queryReports(ctx, query, args...)
}

func (r *kriReportRepository) ListByStatus(ctx context.Context, status string) ([]*entity.KRIReport, error) {
	return r.queryReports(ctx,
		`SELECT rp.id, rp.kri_id,
		        rp.period_label, TO_CHAR(rp.period_start, 'YYYY-MM-DD'), TO_CHAR(rp.period_end, 'YYYY-MM-DD'), TO_CHAR(rp.due_date, 'YYYY-MM-DD'),
		        rp.value, rp.notes, rp.status,
		        rp.submitted_by, rp.submitted_at, rp.generated_by,
		        rp.created_at, rp.updated_at,
		        COALESCE(k.name, ''), COALESCE(k.metric, ''),
		        COALESCE(rs.code, ''), COALESCE(rs.title, ''),
		        COALESCE(u.name, '')
		 FROM kri_reports rp
		 JOIN kris k ON rp.kri_id = k.id
		 LEFT JOIN risks rs ON k.risk_id = rs.id
		 LEFT JOIN users u ON rp.submitted_by = u.id
		 WHERE rp.status = $1
		 ORDER BY rp.due_date ASC`, status)
}

func (r *kriReportRepository) ListPendingOverdue(ctx context.Context, refDate time.Time) ([]*entity.KRIReport, error) {
	return r.queryReports(ctx,
		`SELECT rp.id, rp.kri_id,
		        rp.period_label, TO_CHAR(rp.period_start, 'YYYY-MM-DD'), TO_CHAR(rp.period_end, 'YYYY-MM-DD'), TO_CHAR(rp.due_date, 'YYYY-MM-DD'),
		        rp.value, rp.notes, rp.status,
		        rp.submitted_by, rp.submitted_at, rp.generated_by,
		        rp.created_at, rp.updated_at,
		        COALESCE(k.name, ''), COALESCE(k.metric, ''),
		        COALESCE(rs.code, ''), COALESCE(rs.title, ''),
		        COALESCE(u.name, '')
		 FROM kri_reports rp
		 JOIN kris k ON rp.kri_id = k.id
		 LEFT JOIN risks rs ON k.risk_id = rs.id
		 LEFT JOIN users u ON rp.submitted_by = u.id
		 WHERE rp.status = 'pending' AND rp.due_date < $1
		 ORDER BY rp.due_date ASC`, refDate.Format("2006-01-02"))
}

func (r *kriReportRepository) ReportExistsForPeriod(ctx context.Context, kriID uuid.UUID, periodStart, periodEnd string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(
		   SELECT 1 FROM kri_reports
		   WHERE kri_id = $1 AND period_start = $2 AND period_end = $3
		 )`, kriID, periodStart, periodEnd,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check kri report exists: %w", err)
	}
	return exists, nil
}

func (r *kriReportRepository) GetAllKRIs(ctx context.Context) ([]*entity.KRI, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT k.id, k.risk_id, COALESCE(rs.code, ''), COALESCE(rs.title, ''),
		        k.name, k.description, k.metric, k.threshold_min, k.threshold_max,
		        k.current_value, k.direction, k.frequency,
		        k.organization_id, COALESCE(o.name, ''), k.last_updated, k.created_at
		 FROM kris k
		 LEFT JOIN risks rs ON k.risk_id = rs.id
		 LEFT JOIN organizations o ON k.organization_id = o.id
		 ORDER BY k.created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("get all kris for reporting: %w", err)
	}
	defer rows.Close()

	var kris []*entity.KRI
	for rows.Next() {
		var kri entity.KRI
		if err := rows.Scan(
			&kri.ID, &kri.RiskID, &kri.RiskCode, &kri.RiskTitle,
			&kri.Name, &kri.Description, &kri.Metric, &kri.ThresholdMin,
			&kri.ThresholdMax, &kri.CurrentValue, &kri.Direction, &kri.Frequency,
			&kri.OrganizationID, &kri.OrgName, &kri.LastUpdated, &kri.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan kri: %w", err)
		}
		kris = append(kris, &kri)
	}
	return kris, nil
}

// queryReports is a shared helper to scan report rows
func (r *kriReportRepository) queryReports(ctx context.Context, query string, args ...interface{}) ([]*entity.KRIReport, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query kri reports: %w", err)
	}
	defer rows.Close()

	var reports []*entity.KRIReport
	for rows.Next() {
		var rpt entity.KRIReport
		if err := rows.Scan(
			&rpt.ID, &rpt.KRIID,
			&rpt.PeriodLabel, &rpt.PeriodStart, &rpt.PeriodEnd, &rpt.DueDate,
			&rpt.Value, &rpt.Notes, &rpt.Status,
			&rpt.SubmittedBy, &rpt.SubmittedAt, &rpt.GeneratedBy,
			&rpt.CreatedAt, &rpt.UpdatedAt,
			&rpt.KRIName, &rpt.KRIMetric,
			&rpt.RiskCode, &rpt.RiskTitle,
			&rpt.SubmittedByName,
		); err != nil {
			return nil, fmt.Errorf("scan kri report: %w", err)
		}
		reports = append(reports, &rpt)
	}
	return reports, nil
}
