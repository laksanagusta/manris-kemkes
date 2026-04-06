package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type externalPICRepository struct {
	pool *pgxpool.Pool
}

func NewExternalPICRepository(pool *pgxpool.Pool) repository.ExternalPICRepository {
	return &externalPICRepository{pool: pool}
}

func (r *externalPICRepository) Create(ctx context.Context, pic *entity.ExternalPIC) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO external_pics (name) VALUES ($1) RETURNING id, created_at, updated_at`,
		pic.Name,
	).Scan(&pic.ID, &pic.CreatedAt, &pic.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create external pic: %w", err)
	}
	return nil
}

func (r *externalPICRepository) GetOrCreateByName(ctx context.Context, name string) (*entity.ExternalPIC, error) {
	pic := &entity.ExternalPIC{ID: uuid.New()}

	err := r.pool.QueryRow(ctx,
		`INSERT INTO external_pics (name) VALUES (LOWER($1)) 
		 ON CONFLICT (LOWER(name)) DO UPDATE SET name = EXCLUDED.name
		 RETURNING id, name, created_at, updated_at`,
		name,
	).Scan(&pic.ID, &pic.Name, &pic.CreatedAt, &pic.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get or create external pic: %w", err)
	}
	return pic, nil
}

func (r *externalPICRepository) List(ctx context.Context) ([]*entity.ExternalPIC, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, created_at, updated_at FROM external_pics ORDER BY name ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list external pics: %w", err)
	}
	defer rows.Close()

	var pics []*entity.ExternalPIC
	for rows.Next() {
		pic := &entity.ExternalPIC{}
		if err := rows.Scan(&pic.ID, &pic.Name, &pic.CreatedAt, &pic.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan external pic: %w", err)
		}
		pics = append(pics, pic)
	}
	return pics, nil
}

func (r *externalPICRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.ExternalPIC, error) {
	pic := &entity.ExternalPIC{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, created_at, updated_at FROM external_pics WHERE id = $1`,
		id,
	).Scan(&pic.ID, &pic.Name, &pic.CreatedAt, &pic.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get external pic by id: %w", err)
	}
	return pic, nil
}

func (r *externalPICRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM external_pics WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete external pic: %w", err)
	}
	return nil
}
