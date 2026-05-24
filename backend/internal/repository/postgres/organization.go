package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

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
		`INSERT INTO organizations (name, parent_id, upr_level, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id, upr_level, created_at`,
		org.Name, org.ParentID, org.UPRLevel,
	).Scan(&org.ID, &org.UPRLevel, &org.CreatedAt)

	if err != nil {
		return fmt.Errorf("create organization: %w", err)
	}

	return nil
}

// GetByID retrieves an organization by ID
func (r *organizationRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	org := &entity.Organization{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, parent_id, COALESCE(upr_level, '') as upr_level, created_at FROM organizations WHERE id = $1`, id,
	).Scan(&org.ID, &org.Name, &org.ParentID, &org.UPRLevel, &org.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("find organization by id: %w", err)
	}

	return org, nil
}

// Update updates an organization
func (r *organizationRepository) Update(ctx context.Context, org *entity.Organization) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE organizations SET name=$2, parent_id=$3, upr_level=$4 WHERE id=$1`,
		org.ID, org.Name, org.ParentID, org.UPRLevel,
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
	rows, err := r.pool.Query(ctx, `SELECT id, name, parent_id, COALESCE(upr_level, '') as upr_level, created_at FROM organizations ORDER BY name ASC`)
	if err != nil {
		return nil, fmt.Errorf("list organizations: %w", err)
	}
	defer rows.Close()

	var orgs []*entity.Organization
	for rows.Next() {
		var org entity.Organization
		if err := rows.Scan(&org.ID, &org.Name, &org.ParentID, &org.UPRLevel, &org.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan organization: %w", err)
		}
		orgs = append(orgs, &org)
	}

	return orgs, nil
}

func (r *organizationRepository) ListWithFilter(ctx context.Context, filter repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	countQuery := `SELECT COUNT(*) FROM organizations WHERE 1=1`
	dataQuery := `SELECT id, name, parent_id, COALESCE(upr_level, '') as upr_level, created_at FROM organizations WHERE 1=1`

	var args []interface{}
	argIdx := 1

	if filter.Q != "" {
		f := fmt.Sprintf(" AND name ILIKE $%d", argIdx)
		countQuery += f
		dataQuery += f
		args = append(args, "%"+filter.Q+"%")
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list organizations count: %w", err)
	}

	offset := (filter.Page - 1) * filter.Limit
	dataQuery += " ORDER BY name ASC"
	dataQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list organizations query: %w", err)
	}
	defer rows.Close()

	var orgs []*entity.Organization
	for rows.Next() {
		var org entity.Organization
		if err := rows.Scan(&org.ID, &org.Name, &org.ParentID, &org.UPRLevel, &org.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("list organizations scan: %w", err)
		}
		orgs = append(orgs, &org)
	}

	return orgs, total, nil
}

func (r *organizationRepository) GetContext(ctx context.Context, orgID uuid.UUID) (string, error) {
	type charterContextRow struct {
		period             string
		uprLevel           string
		scope              string
		legalBasis         string
		internalContext    string
		externalContext    string
		stakeholderSummary string
	}

	var row charterContextRow
	err := r.pool.QueryRow(ctx, `
		SELECT period, upr_level, scope, legal_basis, internal_context, external_context, stakeholder_summary
		FROM risk_charters
		WHERE organization_id = $1
		  AND status <> 'archived'
		ORDER BY
			CASE status
				WHEN 'active' THEN 3
				WHEN 'in_review' THEN 2
				ELSE 1
			END DESC,
			period DESC,
			updated_at DESC
		LIMIT 1
	`, orgID).Scan(
		&row.period,
		&row.uprLevel,
		&row.scope,
		&row.legalBasis,
		&row.internalContext,
		&row.externalContext,
		&row.stakeholderSummary,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", fmt.Errorf("get risk charter context: %w", err)
	}

	sections := []string{
		"Piagam MR Aktif",
		"Periode: " + row.period,
		"UPR Level: " + row.uprLevel,
	}
	if trimmed := strings.TrimSpace(row.scope); trimmed != "" {
		sections = append(sections, "Ruang Lingkup: "+trimmed)
	}
	if trimmed := strings.TrimSpace(row.legalBasis); trimmed != "" {
		sections = append(sections, "Dasar Hukum: "+trimmed)
	}
	if trimmed := strings.TrimSpace(row.internalContext); trimmed != "" {
		sections = append(sections, "Konteks Internal: "+trimmed)
	}
	if trimmed := strings.TrimSpace(row.externalContext); trimmed != "" {
		sections = append(sections, "Konteks Eksternal: "+trimmed)
	}
	if trimmed := strings.TrimSpace(row.stakeholderSummary); trimmed != "" {
		sections = append(sections, "Stakeholder: "+trimmed)
	}

	return strings.Join(sections, "\n"), nil
}

func (r *organizationRepository) GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	query := `
		WITH RECURSIVE org_tree AS (
			SELECT id FROM organizations WHERE id = $1
			
			UNION ALL
			
			SELECT o.id 
			FROM organizations o
			INNER JOIN org_tree ot ON o.parent_id = ot.id
		)
		SELECT id FROM org_tree
	`

	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("get organization descendants: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan organization id: %w", err)
		}
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		return []uuid.UUID{orgID}, nil
	}

	return ids, nil
}
