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

type riskCharterRepository struct {
	pool *pgxpool.Pool
}

func NewRiskCharterRepository(pool *pgxpool.Pool) repository.RiskCharterRepository {
	return &riskCharterRepository{pool: pool}
}

func (r *riskCharterRepository) Create(ctx context.Context, charter *entity.RiskCharter) error {
	query := `
		INSERT INTO risk_charters (
			organization_id, upr_level, period, risk_owner_name, risk_owner_user_id,
			risk_team_name, scope, legal_basis, internal_context, external_context,
			stakeholder_summary, created_by, approved_by, approved_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
		)
		RETURNING id, created_at, updated_at
	`

	if err := r.pool.QueryRow(ctx, query,
		charter.OrganizationID,
		charter.UPRLevel,
		charter.Period,
		charter.RiskOwnerName,
		charter.RiskOwnerUserID,
		charter.RiskTeamName,
		charter.Scope,
		charter.LegalBasis,
		charter.InternalContext,
		charter.ExternalContext,
		charter.StakeholderSummary,
		charter.CreatedBy,
		charter.ApprovedBy,
		charter.ApprovedAt,
	).Scan(&charter.ID, &charter.CreatedAt, &charter.UpdatedAt); err != nil {
		return fmt.Errorf("create risk charter: %w", err)
	}

	return nil
}

func (r *riskCharterRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCharter, error) {
	query := `
		SELECT id, organization_id, upr_level, period, risk_owner_name, risk_owner_user_id,
			risk_team_name, scope, legal_basis, internal_context, external_context,
			stakeholder_summary, created_by, approved_by,
			approved_at, created_at, updated_at
		FROM risk_charters
		WHERE id = $1
	`

	charter := &entity.RiskCharter{}
	if err := r.pool.QueryRow(ctx, query, id).Scan(
		&charter.ID,
		&charter.OrganizationID,
		&charter.UPRLevel,
		&charter.Period,
		&charter.RiskOwnerName,
		&charter.RiskOwnerUserID,
		&charter.RiskTeamName,
		&charter.Scope,
		&charter.LegalBasis,
		&charter.InternalContext,
		&charter.ExternalContext,
		&charter.StakeholderSummary,
		&charter.CreatedBy,
		&charter.ApprovedBy,
		&charter.ApprovedAt,
		&charter.CreatedAt,
		&charter.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get risk charter by id: %w", err)
	}

	return charter, nil
}

func (r *riskCharterRepository) Update(ctx context.Context, charter *entity.RiskCharter) error {
	query := `
		UPDATE risk_charters
		SET organization_id = $2,
			upr_level = $3,
			period = $4,
			risk_owner_name = $5,
			risk_owner_user_id = $6,
			risk_team_name = $7,
			scope = $8,
			legal_basis = $9,
			internal_context = $10,
			external_context = $11,
			stakeholder_summary = $12,
			approved_by = $13,
			approved_at = $14,
			updated_at = now()
		WHERE id = $1
		RETURNING updated_at
	`

	if err := r.pool.QueryRow(ctx, query,
		charter.ID,
		charter.OrganizationID,
		charter.UPRLevel,
		charter.Period,
		charter.RiskOwnerName,
		charter.RiskOwnerUserID,
		charter.RiskTeamName,
		charter.Scope,
		charter.LegalBasis,
		charter.InternalContext,
		charter.ExternalContext,
		charter.StakeholderSummary,
		charter.ApprovedBy,
		charter.ApprovedAt,
	).Scan(&charter.UpdatedAt); err != nil {
		return fmt.Errorf("update risk charter: %w", err)
	}

	return nil
}

func (r *riskCharterRepository) List(ctx context.Context, filter repository.RiskCharterListFilter) ([]*entity.RiskCharter, int, error) {
	countQuery := `SELECT COUNT(*) FROM risk_charters WHERE 1=1`
	dataQuery := `
		SELECT id, organization_id, upr_level, period, risk_owner_name, risk_owner_user_id,
			risk_team_name, scope, legal_basis, internal_context, external_context,
			stakeholder_summary, created_by, approved_by,
			approved_at, created_at, updated_at
		FROM risk_charters
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

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk charters: %w", err)
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
		return nil, 0, fmt.Errorf("list risk charters: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskCharter, 0)
	for rows.Next() {
		charter := &entity.RiskCharter{}
		if err := rows.Scan(
			&charter.ID,
			&charter.OrganizationID,
			&charter.UPRLevel,
			&charter.Period,
			&charter.RiskOwnerName,
			&charter.RiskOwnerUserID,
			&charter.RiskTeamName,
			&charter.Scope,
			&charter.LegalBasis,
			&charter.InternalContext,
			&charter.ExternalContext,
			&charter.StakeholderSummary,
			&charter.CreatedBy,
			&charter.ApprovedBy,
			&charter.ApprovedAt,
			&charter.CreatedAt,
			&charter.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk charter: %w", err)
		}
		items = append(items, charter)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate risk charters: %w", err)
	}

	return items, total, nil
}

func (r *riskCharterRepository) ExistsByOrgPeriodLevel(ctx context.Context, organizationID uuid.UUID, period, uprLevel string, excludeID *uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM risk_charters
			WHERE organization_id = $1
			  AND period = $2
			  AND upr_level = $3
			  AND ($4::uuid IS NULL OR id <> $4)
		)
	`

	var exists bool
	if err := r.pool.QueryRow(ctx, query, organizationID, period, uprLevel, excludeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("exists risk charter: %w", err)
	}
	return exists, nil
}