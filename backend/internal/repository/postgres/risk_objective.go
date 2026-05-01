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

type riskObjectiveRepository struct {
	pool *pgxpool.Pool
}

func NewRiskObjectiveRepository(pool *pgxpool.Pool) repository.RiskObjectiveRepository {
	return &riskObjectiveRepository{pool: pool}
}

func (r *riskObjectiveRepository) Create(ctx context.Context, objective *entity.RiskObjective) error {
	query := `
		INSERT INTO risk_objectives (
			organization_id, charter_id, period, tujuan, sasaran,
			indikator_kinerja_utama, target, program, kegiatan, process_business,
			created_by, approved_by, approved_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING id, created_at, updated_at
	`

	if err := r.pool.QueryRow(ctx, query,
		objective.OrganizationID,
		objective.CharterID,
		objective.Period,
		objective.Tujuan,
		objective.Sasaran,
		objective.IndikatorKinerjaUtama,
		objective.Target,
		objective.Program,
		objective.Kegiatan,
		objective.ProcessBusiness,
		objective.CreatedBy,
		objective.ApprovedBy,
		objective.ApprovedAt,
	).Scan(&objective.ID, &objective.CreatedAt, &objective.UpdatedAt); err != nil {
		return fmt.Errorf("create risk objective: %w", err)
	}

	return nil
}

func (r *riskObjectiveRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskObjective, error) {
	query := `
		SELECT id, organization_id, charter_id, period, tujuan, sasaran,
			indikator_kinerja_utama, target, program, kegiatan, process_business,
			created_by, approved_by, approved_at, created_at, updated_at
		FROM risk_objectives
		WHERE id = $1
	`

	objective := &entity.RiskObjective{}
	if err := r.pool.QueryRow(ctx, query, id).Scan(
		&objective.ID,
		&objective.OrganizationID,
		&objective.CharterID,
		&objective.Period,
		&objective.Tujuan,
		&objective.Sasaran,
		&objective.IndikatorKinerjaUtama,
		&objective.Target,
		&objective.Program,
		&objective.Kegiatan,
		&objective.ProcessBusiness,
		&objective.CreatedBy,
		&objective.ApprovedBy,
		&objective.ApprovedAt,
		&objective.CreatedAt,
		&objective.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get risk objective by id: %w", err)
	}

	return objective, nil
}

func (r *riskObjectiveRepository) Update(ctx context.Context, objective *entity.RiskObjective) error {
	query := `
		UPDATE risk_objectives
		SET organization_id = $2,
			charter_id = $3,
			period = $4,
			tujuan = $5,
			sasaran = $6,
			indikator_kinerja_utama = $7,
			target = $8,
			program = $9,
			kegiatan = $10,
			process_business = $11,
			approved_by = $12,
			approved_at = $13,
			updated_at = now()
		WHERE id = $1
		RETURNING updated_at
	`

	if err := r.pool.QueryRow(ctx, query,
		objective.ID,
		objective.OrganizationID,
		objective.CharterID,
		objective.Period,
		objective.Tujuan,
		objective.Sasaran,
		objective.IndikatorKinerjaUtama,
		objective.Target,
		objective.Program,
		objective.Kegiatan,
		objective.ProcessBusiness,
		objective.ApprovedBy,
		objective.ApprovedAt,
	).Scan(&objective.UpdatedAt); err != nil {
		return fmt.Errorf("update risk objective: %w", err)
	}

	return nil
}

func (r *riskObjectiveRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM risk_objectives WHERE id = $1`

	cmdTag, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete risk objective: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("risk objective not found")
	}

	return nil
}

func (r *riskObjectiveRepository) List(ctx context.Context, filter repository.RiskObjectiveListFilter) ([]*entity.RiskObjective, int, error) {
	countQuery := `SELECT COUNT(*) FROM risk_objectives WHERE 1=1`
	dataQuery := `
		SELECT id, organization_id, charter_id, period, tujuan, sasaran,
			indikator_kinerja_utama, target, program, kegiatan, process_business,
			created_by, approved_by, approved_at, created_at, updated_at
		FROM risk_objectives
		WHERE 1=1
	`

	var (
		args   []any
		argPos = 1
	)

	if filter.OrganizationID != nil {
		clause := fmt.Sprintf(" AND organization_id = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, *filter.OrganizationID)
		argPos++
	}
	if strings.TrimSpace(filter.Period) != "" {
		clause := fmt.Sprintf(" AND period = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	}
	if strings.TrimSpace(filter.Q) != "" {
		clause := fmt.Sprintf(" AND (sasaran ILIKE $%d OR indikator_kinerja_utama ILIKE $%d OR tujuan ILIKE $%d OR program ILIKE $%d OR kegiatan ILIKE $%d)", argPos, argPos, argPos, argPos, argPos)
		countQuery += clause
		dataQuery += clause
		q := "%" + strings.TrimSpace(filter.Q) + "%"
		args = append(args, q, q, q, q, q)
		argPos += 5
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk objectives: %w", err)
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

	dataQuery += fmt.Sprintf(" ORDER BY updated_at DESC LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk objectives: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskObjective, 0)
	for rows.Next() {
		objective := &entity.RiskObjective{}
		if err := rows.Scan(
			&objective.ID,
			&objective.OrganizationID,
			&objective.CharterID,
			&objective.Period,
			&objective.Tujuan,
			&objective.Sasaran,
			&objective.IndikatorKinerjaUtama,
			&objective.Target,
			&objective.Program,
			&objective.Kegiatan,
			&objective.ProcessBusiness,
			&objective.CreatedBy,
			&objective.ApprovedBy,
			&objective.ApprovedAt,
			&objective.CreatedAt,
			&objective.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk objective: %w", err)
		}
		items = append(items, objective)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate risk objectives: %w", err)
	}

	return items, total, nil
}