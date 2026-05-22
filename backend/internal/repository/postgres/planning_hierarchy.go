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
	pool *pgxpool.Pool
}

func NewPlanningHierarchyRepository(pool *pgxpool.Pool) repository.PlanningHierarchyRepository {
	return &planningHierarchyRepository{pool: pool}
}

func (r *planningHierarchyRepository) ListROOptions(ctx context.Context, filter repository.PlanningROOptionFilter) ([]entity.PlanningROOption, error) {
	query := `
		SELECT ro.id, ro.title, act.title, prog.title, iku.title, obj.title, goal.title, ro.period
		FROM planning_ros ro
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		LEFT JOIN organizations org ON org.id = $2
		WHERE ro.period = $1
		  AND (
		    ro.scope_mode = 'all_satker'
		    OR EXISTS (
		      SELECT 1
		      FROM planning_ro_scopes scope
		      WHERE scope.ro_id = ro.id
		        AND (
		          scope.organization_id = $2
		          OR (scope.organization_category <> '' AND scope.organization_category = COALESCE(org.upr_level, ''))
		        )
		    )
		  )
	`
	args := []any{strings.TrimSpace(filter.Period), filter.OrganizationID}

	if q := strings.TrimSpace(filter.Q); q != "" {
		query += `
		  AND (
		    goal.title ILIKE $3 OR obj.title ILIKE $3 OR iku.title ILIKE $3 OR prog.title ILIKE $3 OR act.title ILIKE $3 OR ro.title ILIKE $3
		  )`
		args = append(args, "%"+q+"%")
	}

	query += ` ORDER BY goal.updated_at DESC, obj.sort_order, iku.sort_order, prog.sort_order, act.sort_order, ro.title`

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
			&item.KegiatanTitle,
			&item.ProgramTitle,
			&item.IKUTitle,
			&item.SasaranTitle,
			&item.TujuanTitle,
			&item.Period,
		); err != nil {
			return nil, fmt.Errorf("scan ro option: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate ro options: %w", err)
	}

	return items, nil
}

func (r *planningHierarchyRepository) ListObjectiveCompatibilityRows(ctx context.Context, filter repository.PlanningCompatibilityFilter) ([]*entity.RiskObjective, int, error) {
	countQuery := `
		SELECT COUNT(*)
		FROM planning_ros ro
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		WHERE 1=1
	`
	dataQuery := `
		SELECT goal.organization_id, ro.period, goal.title, obj.title, iku.title,
		       COALESCE(iku.target, ''), prog.title, act.title, ro.title,
		       'draft'::text
		FROM planning_ros ro
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		WHERE 1=1
	`

	var args []any
	argPos := 1

	if filter.OrganizationID != nil {
		clause := fmt.Sprintf(" AND goal.organization_id = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, *filter.OrganizationID)
		argPos++
	}
	if strings.TrimSpace(filter.Period) != "" {
		clause := fmt.Sprintf(" AND ro.period = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	}
	if strings.TrimSpace(filter.Q) != "" {
		clause := fmt.Sprintf(" AND (goal.title ILIKE $%d OR obj.title ILIKE $%d OR iku.title ILIKE $%d OR prog.title ILIKE $%d OR act.title ILIKE $%d OR ro.title ILIKE $%d)", argPos, argPos, argPos, argPos, argPos, argPos)
		countQuery += clause
		dataQuery += clause
		q := "%" + strings.TrimSpace(filter.Q) + "%"
		args = append(args, q)
		argPos += 6
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count objective compatibility rows: %w", err)
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	dataQuery += fmt.Sprintf(" ORDER BY goal.updated_at DESC, obj.sort_order, iku.sort_order, prog.sort_order, act.sort_order, ro.title LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list objective compatibility rows: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskObjective, 0)
	for rows.Next() {
		obj := &entity.RiskObjective{}
		var organizationID uuid.UUID
		var status string
		if err := rows.Scan(
			&organizationID,
			&obj.Period,
			&obj.Tujuan,
			&obj.Sasaran,
			&obj.IndikatorKinerjaUtama,
			&obj.Target,
			&obj.Program,
			&obj.Kegiatan,
			&obj.ProcessBusiness,
			&status,
		); err != nil {
			return nil, 0, fmt.Errorf("scan objective compatibility row: %w", err)
		}
		obj.OrganizationID = organizationID
		obj.Status = status
		items = append(items, obj)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate objective compatibility rows: %w", err)
	}

	return items, total, nil
}
