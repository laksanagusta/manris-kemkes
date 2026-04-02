package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// controlRepository is the PostgreSQL implementation of repository.ControlRepository
type controlRepository struct {
	pool *pgxpool.Pool
}

// NewControlRepository creates a new control repository
func NewControlRepository(pool *pgxpool.Pool) repository.ControlRepository {
	return &controlRepository{pool: pool}
}

// Create inserts a new control
func (r *controlRepository) Create(ctx context.Context, control *entity.Control) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO controls (name, description, owner, owner_user_id, frequency, control_type, organization_id, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
		 RETURNING id, created_at`,
		control.Name, control.Description, control.Owner, control.RiskID,
		control.Frequency, control.Type, control.OrganizationID,
	).Scan(&control.ID, &control.CreatedAt)

	if err != nil {
		return fmt.Errorf("create control: %w", err)
	}

	return nil
}

// GetByID retrieves a control by ID
func (r *controlRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Control, error) {
	control := &entity.Control{}
	err := r.pool.QueryRow(ctx,
		`SELECT c.id, c.name, c.description, c.control_type, c.frequency,
		        c.owner, c.organization_id, COALESCE(o.name, '') as org_name, c.created_at
		FROM controls c
		LEFT JOIN organizations o ON c.organization_id = o.id
		WHERE c.id = $1`, id,
	).Scan(
		&control.ID, &control.Name, &control.Description, &control.Type, &control.Frequency,
		&control.Owner, &control.OrganizationID, &control.OrgName, &control.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("find control by id: %w", err)
	}

	return control, nil
}

// Update updates a control
func (r *controlRepository) Update(ctx context.Context, control *entity.Control) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE controls SET name=$2, description=$3, control_type=$4, frequency=$5,
		  owner=$6, organization_id=$7
		 WHERE id=$1`,
		control.ID, control.Name, control.Description,
		control.Type, control.Frequency, control.Owner, control.OrganizationID,
	)

	if err != nil {
		return fmt.Errorf("update control: %w", err)
	}

	return nil
}

// Delete deletes a control
func (r *controlRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM controls WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete control: %w", err)
	}
	return nil
}

// List retrieves controls with optional filters
func (r *controlRepository) List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Control, error) {
	query := `
		SELECT c.id, c.name, c.description, c.control_type, c.frequency,
		       c.owner, c.organization_id, COALESCE(o.name, '') as org_name, c.created_at
		FROM controls c
		LEFT JOIN organizations o ON c.organization_id = o.id
		WHERE 1=1`

	args := []interface{}{}
	argIdx := 1

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND c.organization_id = ANY($%d)", argIdx)
		args = append(args, orgIDs)
		argIdx++
	}

	query += " ORDER BY c.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list controls: %w", err)
	}
	defer rows.Close()

	var controls []*entity.Control
	for rows.Next() {
		var control entity.Control
		if err := rows.Scan(
			&control.ID, &control.Name, &control.Description, &control.Type, &control.Frequency,
			&control.Owner, &control.OrganizationID, &control.OrgName, &control.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan control: %w", err)
		}
		controls = append(controls, &control)
	}

	return controls, nil
}

// GetDashboard retrieves dashboard metrics for controls
func (r *controlRepository) GetDashboard(ctx context.Context, orgIDs []uuid.UUID) (map[string]interface{}, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE latest_result = 'efektif') as effective,
			COUNT(*) FILTER (WHERE latest_result = 'tidak_efektif') as ineffective,
			COUNT(*) FILTER (WHERE latest_result IS NULL) as not_tested
		FROM controls c
		LEFT JOIN LATERAL (
			SELECT result FROM control_tests ct
			WHERE ct.control_id = c.id
			ORDER BY ct.test_date DESC LIMIT 1
		) lt(latest_result) ON TRUE
		WHERE 1=1`

	args := []interface{}{}
	if len(orgIDs) > 0 {
		query += " AND c.organization_id = ANY($1)"
		args = append(args, orgIDs)
	}

	var total, effective, ineffective, notTested int
	err := r.pool.QueryRow(ctx, query, args...).Scan(&total, &effective, &ineffective, &notTested)
	if err != nil {
		return nil, fmt.Errorf("control dashboard: %w", err)
	}

	return map[string]interface{}{
		"total":       total,
		"effective":   effective,
		"ineffective": ineffective,
		"not_tested":  notTested,
	}, nil
}
