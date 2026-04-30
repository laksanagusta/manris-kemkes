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
	err := r.pool.QueryRow(ctx, `
		INSERT INTO risk_objectives (
			organization_id, charter_id, period, tujuan, sasaran,
			indikator_kinerja_utama, target, program, kegiatan, process_business, created_by
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
		)
		RETURNING id, created_at, updated_at
	`, objective.OrganizationID, objective.CharterID, objective.Period, objective.Tujuan, objective.Sasaran,
		objective.IndikatorKinerjaUtama, objective.Target, objective.Program, objective.Kegiatan, objective.ProcessBusiness, objective.CreatedBy,
	).Scan(&objective.ID, &objective.CreatedAt, &objective.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create risk objective: %w", err)
	}
	return nil
}

func (r *riskObjectiveRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskObjective, error) {
	objective := &entity.RiskObjective{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, organization_id, charter_id, period, tujuan, sasaran,
		       indikator_kinerja_utama, target, program, kegiatan, process_business,
		       created_by, created_at, updated_at
		FROM risk_objectives WHERE id = $1
	`, id).Scan(
		&objective.ID, &objective.OrganizationID, &objective.CharterID, &objective.Period, &objective.Tujuan, &objective.Sasaran,
		&objective.IndikatorKinerjaUtama, &objective.Target, &objective.Program, &objective.Kegiatan, &objective.ProcessBusiness,
		&objective.CreatedBy, &objective.CreatedAt, &objective.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get risk objective by id: %w", err)
	}
	return objective, nil
}

func (r *riskObjectiveRepository) Update(ctx context.Context, objective *entity.RiskObjective) error {
	_, err := r.pool.Exec(ctx, `
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
		    updated_at = now()
		WHERE id = $1
	`, objective.ID, objective.OrganizationID, objective.CharterID, objective.Period, objective.Tujuan, objective.Sasaran,
		objective.IndikatorKinerjaUtama, objective.Target, objective.Program, objective.Kegiatan, objective.ProcessBusiness,
	)
	if err != nil {
		return fmt.Errorf("update risk objective: %w", err)
	}
	return nil
}

func (r *riskObjectiveRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM risk_objectives WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete risk objective: %w", err)
	}
	return nil
}

func (r *riskObjectiveRepository) List(ctx context.Context, filter repository.RiskObjectiveListFilter) ([]*entity.RiskObjective, int, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	countQuery := `SELECT COUNT(*) FROM risk_objectives WHERE 1=1`
	dataQuery := `SELECT id, organization_id, charter_id, period, tujuan, sasaran,
		indikator_kinerja_utama, target, program, kegiatan, process_business,
		created_by, created_at, updated_at FROM risk_objectives WHERE 1=1`
	args := []interface{}{}
	argIndex := 1
	if filter.OrganizationID != nil {
		clause := fmt.Sprintf(" AND organization_id = $%d", argIndex)
		countQuery += clause
		dataQuery += clause
		args = append(args, *filter.OrganizationID)
		argIndex++
	}
	if strings.TrimSpace(filter.Period) != "" {
		clause := fmt.Sprintf(" AND period = $%d", argIndex)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Period))
		argIndex++
	}
	if strings.TrimSpace(filter.Query) != "" {
		clause := fmt.Sprintf(" AND (sasaran ILIKE $%d OR indikator_kinerja_utama ILIKE $%d OR program ILIKE $%d OR kegiatan ILIKE $%d)", argIndex, argIndex, argIndex, argIndex)
		countQuery += clause
		dataQuery += clause
		args = append(args, "%"+strings.TrimSpace(filter.Query)+"%")
		argIndex++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk objectives: %w", err)
	}

	offset := (page - 1) * limit
	dataQuery += fmt.Sprintf(" ORDER BY updated_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk objectives: %w", err)
	}
	defer rows.Close()

	items := []*entity.RiskObjective{}
	for rows.Next() {
		item := &entity.RiskObjective{}
		if err := rows.Scan(
			&item.ID, &item.OrganizationID, &item.CharterID, &item.Period, &item.Tujuan, &item.Sasaran,
			&item.IndikatorKinerjaUtama, &item.Target, &item.Program, &item.Kegiatan, &item.ProcessBusiness,
			&item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk objective: %w", err)
		}
		items = append(items, item)
	}
	return items, total, nil
}
