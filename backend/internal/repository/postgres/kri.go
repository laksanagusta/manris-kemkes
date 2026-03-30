package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// kriRepository is the PostgreSQL implementation of repository.KRIRepository
type kriRepository struct {
	pool *pgxpool.Pool
}

// NewKRIRepository creates a new KRI repository
func NewKRIRepository(pool *pgxpool.Pool) repository.KRIRepository {
	return &kriRepository{pool: pool}
}

// Create inserts a new KRI
func (r *kriRepository) Create(ctx context.Context, kri *entity.KRI) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO kris (risk_id, name, description, metric, threshold_min, threshold_max,
		       current_value, direction, frequency, organization_id, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
		 RETURNING id, created_at`,
		kri.RiskID, kri.Name, kri.Description, kri.Metric, kri.ThresholdMin,
		kri.ThresholdMax, kri.CurrentValue, kri.Direction, kri.Frequency, kri.OrganizationID,
	).Scan(&kri.ID, &kri.CreatedAt)

	if err != nil {
		return fmt.Errorf("create kri: %w", err)
	}

	return nil
}

// GetByID retrieves a KRI by ID
func (r *kriRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.KRI, error) {
	kri := &entity.KRI{}
	err := r.pool.QueryRow(ctx,
		`SELECT k.id, k.risk_id, r.code as risk_code, r.title as risk_title,
		       k.name, k.description, k.metric, k.threshold_min, k.threshold_max,
		       k.current_value, k.direction, k.frequency,
		       k.organization_id, o.name as org_name, k.last_updated, k.created_at
		FROM kris k
		LEFT JOIN risks r ON k.risk_id = r.id
		LEFT JOIN organizations o ON k.organization_id = o.id
		WHERE k.id = $1`, id,
	).Scan(
		&kri.ID, &kri.RiskID, &kri.RiskCode, &kri.RiskTitle,
		&kri.Name, &kri.Description, &kri.Metric, &kri.ThresholdMin,
		&kri.ThresholdMax, &kri.CurrentValue, &kri.Direction, &kri.Frequency,
		&kri.OrganizationID, &kri.OrgName, &kri.LastUpdated, &kri.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("find kri by id: %w", err)
	}

	return kri, nil
}

// Update updates a KRI
func (r *kriRepository) Update(ctx context.Context, kri *entity.KRI) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE kris SET risk_id=$2, name=$3, description=$4, metric=$5,
		       threshold_min=$6, threshold_max=$7, current_value=$8, direction=$9,
		       frequency=$10, organization_id=$11, last_updated=NOW()
		 WHERE id=$1`,
		kri.ID, kri.RiskID, kri.Name, kri.Description, kri.Metric,
		kri.ThresholdMin, kri.ThresholdMax, kri.CurrentValue, kri.Direction,
		kri.Frequency, kri.OrganizationID,
	)

	if err != nil {
		return fmt.Errorf("update kri: %w", err)
	}

	return nil
}

// Delete deletes a KRI
func (r *kriRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM kris WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete kri: %w", err)
	}
	return nil
}

// List retrieves KRIs with optional filters
func (r *kriRepository) List(ctx context.Context, orgID *uuid.UUID) ([]*entity.KRI, error) {
	query := `
		SELECT k.id, k.risk_id, r.code as risk_code, r.title as risk_title,
		       k.name, k.description, k.metric, k.threshold_min, k.threshold_max,
		       k.current_value, k.direction, k.frequency,
		       k.organization_id, o.name as org_name, k.last_updated, k.created_at
		FROM kris k
		LEFT JOIN risks r ON k.risk_id = r.id
		LEFT JOIN organizations o ON k.organization_id = o.id`

	args := []interface{}{}
	argIdx := 1

	if orgID != nil {
		query += fmt.Sprintf(" WHERE k.organization_id = $%d", argIdx)
		args = append(args, orgID)
		argIdx++
	}

	query += " ORDER BY k.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list kris: %w", err)
	}
	defer rows.Close()

	var kris []*entity.KRI
	for rows.Next() {
		var kri entity.KRI
		if err := rows.Scan(
			&kri.ID, &kri.RiskID, &kri.RiskCode, &kri.RiskTitle,
			&kri.Name, &kri.Description, &kri.Metric, &kri.ThresholdMin,
			&kri.ThresholdMax, &kri.CurrentValue, &kri.Direction, &kri.Frequency,
			&kri.OrganizationID, &kri.OrgName, &kri.LastUpdated, &kri.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan kri: %w", err)
		}
		kris = append(kris, &kri)
	}

	return kris, nil
}

// GetDashboard retrieves dashboard metrics for KRIs
func (r *kriRepository) GetDashboard(ctx context.Context, orgID *uuid.UUID) (map[string]interface{}, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE current_value > threshold_max OR current_value < threshold_min) as breached,
			COUNT(*) FILTER (WHERE direction = 'increasing' AND current_value >= threshold_max * 0.9) as warning,
			COUNT(*) FILTER (WHERE direction = 'decreasing' AND current_value <= threshold_min * 1.1) as warning_down
		FROM kris`

	args := []interface{}{}
	if orgID != nil {
		query += " WHERE organization_id = $1"
		args = append(args, orgID)
	}

	var total, breached, warning, warningDown int
	err := r.pool.QueryRow(ctx, query, args...).Scan(&total, &breached, &warning, &warningDown)
	if err != nil {
		return nil, fmt.Errorf("kri dashboard: %w", err)
	}

	return map[string]interface{}{
		"total":    total,
		"breached": breached,
		"warning":  warning + warningDown,
		"safe":     total - breached,
	}, nil
}
