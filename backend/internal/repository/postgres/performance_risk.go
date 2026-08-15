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

type performanceRiskRepository struct {
	pool *pgxpool.Pool
}

func NewPerformanceRiskRepository(pool *pgxpool.Pool) repository.PerformanceRiskRepository {
	return &performanceRiskRepository{pool: pool}
}

func (r *performanceRiskRepository) ListPlanningNodes(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error) {
	query := `
		SELECT ro.id, ro.title, act.title, prog.title, iku.title, obj.title,
		       plan.id, plan.title, plan.status, plan.period, goal.title
		FROM planning_ros ro
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		JOIN planning plan ON plan.id = goal.planning_id
		WHERE ro.freeze_status IN ('active', 'frozen')
	`
	args := []any{}
	argPos := 1
	if filter.PlanningID != nil {
		query += fmt.Sprintf(" AND plan.id = $%d", argPos)
		args = append(args, *filter.PlanningID)
		argPos++
	} else {
		query += fmt.Sprintf(" AND plan.period = $%d", argPos)
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	}
	if len(filter.OrgIDs) > 0 {
		query += fmt.Sprintf(`
		  AND (
		    ro.scope_mode = 'all_satker'
		    OR EXISTS (
		      SELECT 1
		      FROM planning_ro_scopes scope
		      WHERE scope.ro_id = ro.id
		        AND (
		          scope.organization_id = ANY($%d::uuid[])
		          OR (
		            scope.organization_category <> ''
		            AND EXISTS (
		              SELECT 1
		              FROM organizations org
		              WHERE org.id = ANY($%d::uuid[])
		                AND org.upr_level = scope.organization_category
		            )
		          )
		        )
		    )
		  )`, argPos, argPos)
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
		argPos++
	}
	query += ` ORDER BY plan.updated_at DESC, obj.sort_order, iku.sort_order, prog.sort_order, act.sort_order, ro.title`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk planning nodes: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskPlanningNode, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskPlanningNode{}
		if err := rows.Scan(
			&item.ROID,
			&item.ROTitle,
			&item.ActivityTitle,
			&item.ProgramTitle,
			&item.IKUTitle,
			&item.ObjectiveTitle,
			&item.PlanningID,
			&item.PlanningTitle,
			&item.PlanningStatus,
			&item.PlanningPeriod,
			&item.TujuanTitle,
		); err != nil {
			return nil, fmt.Errorf("scan performance risk planning node: %w", err)
		}
		item.KegiatanTitle = item.ActivityTitle
		item.SasaranTitle = item.ObjectiveTitle
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk planning nodes: %w", err)
	}
	return items, nil
}

func (r *performanceRiskRepository) ListRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	query := `
		SELECT r.id, r.ro_id, r.code, r.title, r.organization_id, COALESCE(o.name, ''),
		       r.probability, r.impact, r.inherent_score,
		       COALESCE(r.category, ''), r.status, COALESCE(r.assessment_cycle, ''),
		       COALESCE(array_remove(array_agg(mt.due_date::text ORDER BY mt.due_date) FILTER (WHERE mt.status IN ('pending', 'overdue')), NULL), '{}'::text[]) AS mitigation_due_dates,
		       COUNT(mt.id) FILTER (WHERE mt.status = 'done') AS mitigation_done_count,
		       COUNT(mt.id) FILTER (WHERE mt.status = 'pending') AS mitigation_pending_count,
		       COUNT(mt.id) FILTER (WHERE mt.status = 'overdue') AS mitigation_overdue_count
		FROM risks r
		LEFT JOIN organizations o ON o.id = r.organization_id
		JOIN planning_ros ro ON ro.id = r.ro_id
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		JOIN planning plan ON plan.id = goal.planning_id
		LEFT JOIN mitigation_tasks mt ON mt.risk_id = r.id
		WHERE r.status = 'final'
		  AND r.archived_at IS NULL
		  AND r.ro_id IS NOT NULL
	`
	args := []any{}
	argPos := 1
	if filter.PlanningID != nil {
		query += fmt.Sprintf(" AND plan.id = $%d", argPos)
		args = append(args, *filter.PlanningID)
		argPos++
	}
	if strings.TrimSpace(filter.Period) != "" {
		query += fmt.Sprintf(" AND r.assessment_cycle = $%d", argPos)
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	} else if filter.PlanningID != nil {
		query += ` AND r.assessment_cycle = CASE
			WHEN plan.period ~ '^[0-9]{4}-H1$' THEN LEFT(plan.period, 4) || '-Q2'
			WHEN plan.period ~ '^[0-9]{4}-H2$' THEN LEFT(plan.period, 4) || '-Q4'
			ELSE plan.period
		END`
	}
	if len(filter.OrgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d::uuid[])", argPos)
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
		argPos++
	}
	query += `
		GROUP BY r.id, r.ro_id, r.code, r.title, r.organization_id, o.name,
		         r.probability, r.impact, r.inherent_score, r.category, r.status, r.assessment_cycle
		ORDER BY COALESCE(o.name, ''), r.code, r.title`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk rows: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskRiskRow, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskRiskRow{}
		if err := rows.Scan(&item.ID, &item.ROID, &item.Code, &item.Title, &item.OrganizationID, &item.OrganizationName, &item.Probability, &item.Impact, &item.InherentScore, &item.Category, &item.Status, &item.AssessmentCycle, &item.MitigationDueDates, &item.MitigationDoneCount, &item.MitigationPendingCount, &item.MitigationOverdueCount); err != nil {
			return nil, fmt.Errorf("scan performance risk row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk rows: %w", err)
	}
	return items, nil
}

func (r *performanceRiskRepository) ListMitigationRowsByROID(ctx context.Context, roID uuid.UUID, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error) {
	query := `
		SELECT mt.id, mt.risk_id, r.code, r.title, COALESCE(m.action, ''), COALESCE(m.owner, ''),
		       mt.due_date::text, mt.status,
		       COALESCE(o.name, '')
		FROM mitigation_tasks mt
		JOIN risks r ON r.id = mt.risk_id
		JOIN planning_ros ro ON ro.id = r.ro_id
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		JOIN planning plan ON plan.id = goal.planning_id
		LEFT JOIN mitigations m ON m.id = mt.mitigation_id
		LEFT JOIN organizations o ON o.id = r.organization_id
		WHERE r.ro_id = $1
		  AND r.status = 'final'
		  AND r.archived_at IS NULL
		  AND mt.status IN ('pending', 'overdue')
	`
	args := []any{roID}
	argPos := 2
	if filter.PlanningID != nil {
		query += fmt.Sprintf(" AND plan.id = $%d", argPos)
		args = append(args, *filter.PlanningID)
		argPos++
	}
	if strings.TrimSpace(filter.Period) != "" {
		query += fmt.Sprintf(" AND r.assessment_cycle = $%d", argPos)
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	} else if filter.PlanningID != nil {
		query += ` AND r.assessment_cycle = CASE
			WHEN plan.period ~ '^[0-9]{4}-H1$' THEN LEFT(plan.period, 4) || '-Q2'
			WHEN plan.period ~ '^[0-9]{4}-H2$' THEN LEFT(plan.period, 4) || '-Q4'
			ELSE plan.period
		END`
	}
	if len(filter.OrgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d::uuid[])", argPos)
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
	}
	query += ` ORDER BY mt.due_date, r.code, m.action`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk mitigations: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskMitigationRow, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskMitigationRow{}
		if err := rows.Scan(&item.ID, &item.RiskID, &item.RiskCode, &item.RiskTitle, &item.Action, &item.Owner, &item.DueDate, &item.Status, &item.OrganizationName); err != nil {
			return nil, fmt.Errorf("scan performance risk mitigation: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk mitigations: %w", err)
	}
	return items, nil
}

func (r *performanceRiskRepository) ListUnlinkedRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	query := `
		SELECT r.id, r.ro_id, r.code, r.title, r.organization_id, COALESCE(o.name, ''),
		       r.probability, r.impact, r.inherent_score,
		       COALESCE(r.category, ''), r.status, COALESCE(r.assessment_cycle, ''),
		       '{}'::text[] AS mitigation_due_dates
		FROM risks r
		LEFT JOIN organizations o ON o.id = r.organization_id
		WHERE r.status = 'final'
		  AND r.archived_at IS NULL
		  AND r.ro_id IS NULL
	`
	args := []any{}
	if filter.PlanningID != nil {
		query += ` AND r.assessment_cycle = (
			SELECT CASE
				WHEN period ~ '^[0-9]{4}-H1$' THEN LEFT(period, 4) || '-Q2'
				WHEN period ~ '^[0-9]{4}-H2$' THEN LEFT(period, 4) || '-Q4'
				ELSE period
			END
			FROM planning WHERE id = $1
		)`
		args = append(args, *filter.PlanningID)
	} else {
		query += " AND r.assessment_cycle = $1"
		args = append(args, strings.TrimSpace(filter.Period))
	}
	if len(filter.OrgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d::uuid[])", len(args)+1)
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
	}
	query += ` ORDER BY COALESCE(o.name, ''), r.code, r.title`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk unlinked risks: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskRiskRow, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskRiskRow{}
		if err := rows.Scan(&item.ID, &item.ROID, &item.Code, &item.Title, &item.OrganizationID, &item.OrganizationName, &item.Probability, &item.Impact, &item.InherentScore, &item.Category, &item.Status, &item.AssessmentCycle, &item.MitigationDueDates); err != nil {
			return nil, fmt.Errorf("scan performance risk unlinked risk: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk unlinked risks: %w", err)
	}
	return items, nil
}
