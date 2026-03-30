package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/model"
)

// OrganizationRepo handles organization-related database operations.
type OrganizationRepo struct {
	pool *pgxpool.Pool
}

// NewOrganizationRepo creates a new OrganizationRepo.
func NewOrganizationRepo(pool *pgxpool.Pool) *OrganizationRepo {
	return &OrganizationRepo{pool: pool}
}

// FindAll retrieves all organizations.
func (r *OrganizationRepo) FindAll(ctx context.Context) ([]model.Organization, error) {
	query := `SELECT id, name, parent_id, created_at FROM organizations ORDER BY name ASC`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []model.Organization
	for rows.Next() {
		var org model.Organization
		if err := rows.Scan(&org.ID, &org.Name, &org.ParentID, &org.CreatedAt); err != nil {
			return nil, err
		}
		orgs = append(orgs, org)
	}

	return orgs, nil
}
