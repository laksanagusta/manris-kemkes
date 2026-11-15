package postgres

import (
	"context"
	"fmt"
	"github.com/google/uuid"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

func (r *mitigationTaskRepository) ListScopedPage(ctx context.Context, filter repository.ScopedTaskPageFilter) (*repository.ScopedTaskPage, error) {
	from := ` FROM mitigation_tasks t
		JOIN mitigations m ON m.id = t.mitigation_id
		JOIN risks r ON r.id = t.risk_id
		LEFT JOIN users u ON u.id = t.reported_by
		WHERE (COALESCE(cardinality($1::uuid[]), 0) = 0 OR r.organization_id = ANY($1::uuid[]))`
	args := []any{filter.OrgIDs}
	switch {
	case filter.RiskID != nil:
		from += " AND t.risk_id = $2"
		args = append(args, *filter.RiskID)
	case filter.MonitoringID != nil:
		from += " AND t.monitoring_id = $2"
		args = append(args, *filter.MonitoringID)
	default:
		return nil, fmt.Errorf("document scope is required")
	}
	result := &repository.ScopedTaskPage{Page: filter.Page, Limit: filter.Limit}
	summaryQuery := `SELECT COUNT(*),
		COUNT(*) FILTER (WHERE t.status = 'done'),
		COUNT(*) FILTER (WHERE t.status = 'pending'),
		COUNT(*) FILTER (WHERE t.status = 'overdue'),
		COUNT(*) FILTER (WHERE t.status = 'not_reported')` + from
	if err := r.pool.QueryRow(ctx, summaryQuery, args...).Scan(
		&result.Summary.Total, &result.Summary.Done, &result.Summary.Pending,
		&result.Summary.Overdue, &result.Summary.NotReported,
	); err != nil {
		return nil, fmt.Errorf("count document tasks: %w", err)
	}
	result.Total = result.Summary.Total
	if filter.MitigationID != nil {
		args = append(args, *filter.MitigationID)
		from += fmt.Sprintf(" AND t.mitigation_id = $%d", len(args))
		if err := r.pool.QueryRow(ctx, "SELECT COUNT(*)"+from, args...).Scan(&result.Total); err != nil {
			return nil, fmt.Errorf("count filtered document tasks: %w", err)
		}
	}
	query := `SELECT t.id, t.mitigation_id, t.risk_id, t.monitoring_id,
		t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
		t.status, t.evidence_url, t.notes, t.report_output, t.report_obstacle,
		t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
		m.action, m.owner, COALESCE(r.code, ''), COALESCE(r.title, ''), COALESCE(u.name, ''), ` + mitigationTaskMonitoringStatusSQL + from + `
		ORDER BY CASE t.status WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 WHEN 'done' THEN 2
			WHEN 'skipped' THEN 3 WHEN 'not_reported' THEN 4 ELSE 99 END,
		CASE WHEN t.status = 'done' THEN t.reported_at END DESC NULLS LAST,
		t.due_date ASC NULLS LAST, t.id DESC`
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, filter.Limit, (filter.Page-1)*filter.Limit)
	tasks, err := r.queryTasks(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	if tasks == nil {
		tasks = []*entity.MitigationTask{}
	}
	result.Data = tasks
	return result, nil
}

func (r *mitigationTaskRepository) ListPeriods(ctx context.Context, orgIDs []uuid.UUID) ([]string, error) {
	query := `SELECT DISTINCT btrim(t.period_label) AS period
		FROM mitigation_tasks t
		JOIN mitigations m ON m.id = t.mitigation_id
		JOIN risks r ON r.id = t.risk_id
		WHERE t.period_label IS NOT NULL AND btrim(t.period_label) <> ''`
	var args []any
	if len(orgIDs) > 0 {
		query += " AND r.organization_id = ANY($1::uuid[])"
		args = append(args, orgIDs)
	}
	rows, err := r.pool.Query(ctx, query+" ORDER BY period DESC", args...)
	if err != nil {
		return nil, fmt.Errorf("list task periods: %w", err)
	}
	defer rows.Close()
	periods := []string{}
	for rows.Next() {
		var period string
		if err := rows.Scan(&period); err != nil {
			return nil, err
		}
		periods = append(periods, period)
	}
	return periods, rows.Err()
}
