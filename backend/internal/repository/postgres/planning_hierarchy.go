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

type planningHierarchyRepository struct {
	pool repositoryDB
}

func NewPlanningHierarchyRepository(pool *pgxpool.Pool) repository.PlanningHierarchyRepository {
	return &planningHierarchyRepository{pool: pool}
}

func (r *planningHierarchyRepository) ListROOptions(ctx context.Context, filter repository.PlanningROOptionFilter) ([]entity.PlanningROOption, error) {
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
		LEFT JOIN organizations org ON org.id = $1
		WHERE 1=1
		  AND (
		    ro.scope_mode = 'all_satker'
		    OR EXISTS (
		      SELECT 1
		      FROM planning_ro_scopes scope
		      WHERE scope.ro_id = ro.id
		        AND (
		          scope.organization_id = $1
		          OR (scope.organization_category <> '' AND scope.organization_category = COALESCE(org.upr_level, ''))
		        )
		    )
		  )
	`
	args := []any{filter.OrganizationID}
	argPos := 2
	if filter.PlanningID != nil {
		query += fmt.Sprintf(" AND plan.id = $%d", argPos)
		args = append(args, *filter.PlanningID)
		argPos++
	} else {
		query += fmt.Sprintf(" AND plan.period = $%d", argPos)
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	}

	if q := strings.TrimSpace(filter.Q); q != "" {
		query += fmt.Sprintf(`
		  AND (
		    plan.title ILIKE $%d OR obj.title ILIKE $%d OR iku.title ILIKE $%d OR prog.title ILIKE $%d OR act.title ILIKE $%d OR ro.title ILIKE $%d
		  )`, argPos, argPos, argPos, argPos, argPos, argPos)
		args = append(args, "%"+q+"%")
		argPos++
	}

	query += ` ORDER BY plan.updated_at DESC, obj.sort_order, iku.sort_order, prog.sort_order, act.sort_order, ro.title`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list ro options: %w", err)
	}
	defer rows.Close()

	items := make([]entity.PlanningROOption, 0)
	for rows.Next() {
		var item entity.PlanningROOption
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
			return nil, fmt.Errorf("scan ro option: %w", err)
		}
		item.KegiatanTitle = item.ActivityTitle
		item.SasaranTitle = item.ObjectiveTitle
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate ro options: %w", err)
	}

	return items, nil
}

func (r *planningHierarchyRepository) ListCompatibilityPeriods(ctx context.Context, organizationID *uuid.UUID) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT DISTINCT period FROM planning WHERE period <> '' AND ($1::uuid IS NULL OR organization_id = $1) ORDER BY period DESC`, organizationID)
	if err != nil {
		return nil, fmt.Errorf("list planning periods: %w", err)
	}
	defer rows.Close()
	periods := make([]string, 0)
	for rows.Next() {
		var period string
		if err := rows.Scan(&period); err != nil {
			return nil, fmt.Errorf("scan planning period: %w", err)
		}
		periods = append(periods, period)
	}
	return periods, rows.Err()
}

func (r *planningHierarchyRepository) ListObjectiveCompatibilityRows(ctx context.Context, filter repository.PlanningCompatibilityFilter) ([]*entity.RiskObjective, int, error) {
	from := `
  FROM planning plan
  LEFT JOIN planning_goals goal ON goal.planning_id = plan.id
  LEFT JOIN planning_objectives obj ON obj.goal_id = goal.id
  LEFT JOIN planning_ikus iku ON iku.objective_id = obj.id
  LEFT JOIN planning_programs prog ON prog.iku_id = iku.id
  LEFT JOIN planning_activities act ON act.program_id = prog.id
  LEFT JOIN planning_ros ro ON ro.activity_id = act.id
  LEFT JOIN organizations org ON org.id = plan.organization_id
  WHERE 1=1
 `
	var args []any
	if filter.OrganizationID != nil {
		args = append(args, *filter.OrganizationID)
		from += fmt.Sprintf(" AND plan.organization_id = $%d", len(args))
	}
	if filter.Period != "" {
		args = append(args, filter.Period)
		from += fmt.Sprintf(" AND plan.period = $%d", len(args))
	}
	if filter.Q != "" {
		args = append(args, strings.TrimSpace(filter.Q))
		from += fmt.Sprintf(` AND strpos(lower(concat_ws(' ', plan.title, goal.title, obj.title, iku.title, iku.target, prog.title, act.title, ro.title, org.name)), lower($%d)) > 0`, len(args))
	}
	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(DISTINCT plan.id) "+from, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count objective compatibility rows: %w", err)
	}
	page := max(1, filter.Page)
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	if page > max(1, (total+limit-1)/limit) {
		return []*entity.RiskObjective{}, total, nil
	}
	order := collectionOrderBy(filter.SortBy, filter.SortOrder, "created_at", "planning_id", map[string]string{
		"created_at": "created_at", "structure": "planning_title", "period": "period", "count": "row_count", "level": "created_at",
	})
	// Page complete plans so counts and hierarchy branches refer to the same unit.
	dataQuery := `WITH matched_rows AS (
  SELECT COALESCE(ro.id, act.id, prog.id, iku.id, obj.id, goal.id, plan.id) AS row_id,
   plan.id AS planning_id, plan.organization_id, plan.period, plan.title AS planning_title,
   plan.status AS planning_status, plan.created_at,
   COALESCE(goal.title, '') AS goal_title, COALESCE(obj.title, '') AS objective_title,
   COALESCE(iku.title, '') AS iku_title, COALESCE(iku.target, '') AS target,
   COALESCE(prog.title, '') AS program_title, COALESCE(act.title, '') AS activity_title,
   COALESCE(ro.title, '') AS ro_title, goal.created_at AS goal_created_at, goal.id AS goal_id,
   obj.sort_order AS objective_order, iku.sort_order AS iku_order,
   prog.sort_order AS program_order, act.sort_order AS activity_order
 ` + from + `), plan_groups AS (
  SELECT planning_id, planning_title, period, created_at, COUNT(*) AS row_count
  FROM matched_rows GROUP BY planning_id, planning_title, period, created_at
 ), paged_plans AS (
  SELECT *, row_number() OVER (ORDER BY ` + order + `) AS page_order FROM plan_groups
  ORDER BY ` + order + fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2) + `
 )
 SELECT r.row_id, r.planning_id, r.organization_id, r.period, r.planning_title, r.planning_status,
  r.goal_title, r.objective_title, r.iku_title, r.target, r.program_title, r.activity_title,
  r.ro_title, 'draft'::text
 FROM matched_rows r JOIN paged_plans p ON p.planning_id = r.planning_id
 ORDER BY p.page_order, r.goal_created_at DESC, r.goal_id DESC,
  r.objective_order, r.iku_order, r.program_order, r.activity_order, r.ro_title, r.row_id
 `
	args = append(args, limit, (page-1)*limit)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list objective compatibility rows: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskObjective, 0)
	for rows.Next() {
		obj := &entity.RiskObjective{}
		var organizationID uuid.UUID
		if err := rows.Scan(
			&obj.ID,
			&obj.PlanningID,
			&organizationID,
			&obj.PlanningPeriod,
			&obj.PlanningTitle,
			&obj.PlanningStatus,
			&obj.Tujuan,
			&obj.Sasaran,
			&obj.IndikatorKinerjaUtama,
			&obj.Target,
			&obj.Program,
			&obj.Kegiatan,
			&obj.ProcessBusiness,
			&obj.Status,
		); err != nil {
			return nil, 0, fmt.Errorf("scan objective compatibility row: %w", err)
		}
		obj.OrganizationID = organizationID
		obj.Period = obj.PlanningPeriod
		items = append(items, obj)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate objective compatibility rows: %w", err)
	}

	return items, total, nil
}
