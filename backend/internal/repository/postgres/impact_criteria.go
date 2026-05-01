package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// impactCriteriaRepo implements repository.ImpactCriteriaRepository.
type impactCriteriaRepo struct {
	db *pgxpool.Pool
}

// NewImpactCriteriaRepository creates a new impact criteria repository.
func NewImpactCriteriaRepository(db *pgxpool.Pool) repository.ImpactCriteriaRepository {
	return &impactCriteriaRepo{db: db}
}

func (r *impactCriteriaRepo) List(ctx context.Context, filter repository.ImpactCriteriaFilter) ([]*entity.ImpactCriteria, error) {
	query := `SELECT id, category, upr_level, impact_level, impact_label, description, created_at FROM impact_criteria WHERE 1=1`
	args := []any{}
	argIdx := 1

	if filter.Category != nil {
		query += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, *filter.Category)
		argIdx++
	}
	if filter.UPRLevel != nil {
		query += fmt.Sprintf(" AND upr_level = $%d", argIdx)
		args = append(args, *filter.UPRLevel)
		argIdx++
	}
	if filter.ImpactLevel != nil {
		query += fmt.Sprintf(" AND impact_level = $%d", argIdx)
		args = append(args, *filter.ImpactLevel)
		argIdx++
	}

	query += " ORDER BY category, upr_level, impact_level"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query impact_criteria: %w", err)
	}
	defer rows.Close()

	var criteria []*entity.ImpactCriteria
	for rows.Next() {
		var c entity.ImpactCriteria
		if err := rows.Scan(&c.ID, &c.Category, &c.UPRLevel, &c.ImpactLevel, &c.ImpactLabel, &c.Description, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan impact_criteria: %w", err)
		}
		criteria = append(criteria, &c)
	}
	return criteria, rows.Err()
}

func (r *impactCriteriaRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.ImpactCriteria, error) {
	query := `SELECT id, category, upr_level, impact_level, impact_label, description, created_at FROM impact_criteria WHERE id = $1`
	var c entity.ImpactCriteria
	err := r.db.QueryRow(ctx, query, id).Scan(&c.ID, &c.Category, &c.UPRLevel, &c.ImpactLevel, &c.ImpactLabel, &c.Description, &c.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get impact_criteria by id: %w", err)
	}
	return &c, nil
}

// GetByCategoryAndUPR returns all criteria for a given category and UPR level.
func (r *impactCriteriaRepo) GetByCategoryAndUPR(ctx context.Context, category, uprLevel string) ([]*entity.ImpactCriteria, error) {
	query := `SELECT id, category, upr_level, impact_level, impact_label, description, created_at FROM impact_criteria WHERE category = $1 AND upr_level = $2 ORDER BY impact_level`
	rows, err := r.db.Query(ctx, query, category, uprLevel)
	if err != nil {
		return nil, fmt.Errorf("query impact_criteria by category/upr: %w", err)
	}
	defer rows.Close()

	var criteria []*entity.ImpactCriteria
	for rows.Next() {
		var c entity.ImpactCriteria
		if err := rows.Scan(&c.ID, &c.Category, &c.UPRLevel, &c.ImpactLevel, &c.ImpactLabel, &c.Description, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan impact_criteria: %w", err)
		}
		criteria = append(criteria, &c)
	}
	return criteria, rows.Err()
}

// Count returns total row count.
func (r *impactCriteriaRepo) Count(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM impact_criteria").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count impact_criteria: %w", err)
	}
	return count, nil
}

// Ensure the interface is satisfied.
var _ repository.ImpactCriteriaRepository = (*impactCriteriaRepo)(nil)

// Helper for filter building (kept for future extensibility).
func buildImpactCriteriaFilter(conditions []string, args []any) (string, []any) {
	if len(conditions) == 0 {
		return "", args
	}
	return " AND " + strings.Join(conditions, " AND "), args
}