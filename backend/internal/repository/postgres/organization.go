package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// organizationRepository is the PostgreSQL implementation of repository.OrganizationRepository
type organizationRepository struct {
	pool *pgxpool.Pool
}

// NewOrganizationRepository creates a new organization repository
func NewOrganizationRepository(pool *pgxpool.Pool) repository.OrganizationRepository {
	return &organizationRepository{pool: pool}
}

// Create inserts a new organization
func (r *organizationRepository) Create(ctx context.Context, org *entity.Organization) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO organizations (name, parent_id, created_at) VALUES ($1,$2,NOW()) RETURNING id, created_at`,
		org.Name, org.ParentID,
	).Scan(&org.ID, &org.CreatedAt)

	if err != nil {
		return fmt.Errorf("create organization: %w", err)
	}

	return nil
}

// GetByID retrieves an organization by ID
func (r *organizationRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	org := &entity.Organization{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, parent_id, created_at FROM organizations WHERE id = $1`, id,
	).Scan(&org.ID, &org.Name, &org.ParentID, &org.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("find organization by id: %w", err)
	}

	return org, nil
}

// Update updates an organization
func (r *organizationRepository) Update(ctx context.Context, org *entity.Organization) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE organizations SET name=$2, parent_id=$3 WHERE id=$1`,
		org.ID, org.Name, org.ParentID,
	)

	if err != nil {
		return fmt.Errorf("update organization: %w", err)
	}

	return nil
}

// Delete deletes an organization
func (r *organizationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM organizations WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete organization: %w", err)
	}
	return nil
}

// List retrieves all organizations
func (r *organizationRepository) List(ctx context.Context) ([]*entity.Organization, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, parent_id, created_at FROM organizations ORDER BY name ASC`)
	if err != nil {
		return nil, fmt.Errorf("list organizations: %w", err)
	}
	defer rows.Close()

	var orgs []*entity.Organization
	for rows.Next() {
		var org entity.Organization
		if err := rows.Scan(&org.ID, &org.Name, &org.ParentID, &org.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan organization: %w", err)
		}
		orgs = append(orgs, &org)
	}

	return orgs, nil
}
