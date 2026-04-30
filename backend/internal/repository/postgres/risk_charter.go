package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

type riskCharterRepository struct {
	pool *pgxpool.Pool
}

func NewRiskCharterRepository(pool *pgxpool.Pool) repository.RiskCharterRepository {
	return &riskCharterRepository{pool: pool}
}

func (r *riskCharterRepository) Create(ctx context.Context, charter *entity.RiskCharter) error {
	if len(charter.UPRStructure) == 0 {
		charter.UPRStructure = json.RawMessage("[]")
	}

	err := r.pool.QueryRow(ctx, `
		INSERT INTO risk_charters (
			organization_id, upr_level, period, risk_owner_name, risk_owner_user_id,
			risk_team_name, scope, legal_basis, internal_context, external_context,
			stakeholder_summary, upr_structure, status, created_by, approved_by, approved_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
		)
		RETURNING id, created_at, updated_at
	`,
		charter.OrganizationID, charter.UPRLevel, charter.Period, charter.RiskOwnerName, charter.RiskOwnerUserID,
		charter.RiskTeamName, charter.Scope, charter.LegalBasis, charter.InternalContext, charter.ExternalContext,
		charter.StakeholderSummary, []byte(charter.UPRStructure), charter.Status, charter.CreatedBy, charter.ApprovedBy, charter.ApprovedAt,
	).Scan(&charter.ID, &charter.CreatedAt, &charter.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create risk charter: %w", err)
	}
	return nil
}

func (r *riskCharterRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCharter, error) {
	charter := &entity.RiskCharter{}
	var uprStructure []byte
	err := r.pool.QueryRow(ctx, `
		SELECT id, organization_id, upr_level, period, risk_owner_name, risk_owner_user_id,
		       risk_team_name, scope, legal_basis, internal_context, external_context,
		       stakeholder_summary, upr_structure, status, created_by, approved_by, approved_at,
		       created_at, updated_at
		FROM risk_charters
		WHERE id = $1
	`, id).Scan(
		&charter.ID, &charter.OrganizationID, &charter.UPRLevel, &charter.Period, &charter.RiskOwnerName, &charter.RiskOwnerUserID,
		&charter.RiskTeamName, &charter.Scope, &charter.LegalBasis, &charter.InternalContext, &charter.ExternalContext,
		&charter.StakeholderSummary, &uprStructure, &charter.Status, &charter.CreatedBy, &charter.ApprovedBy, &charter.ApprovedAt,
		&charter.CreatedAt, &charter.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get risk charter by id: %w", err)
	}
	charter.UPRStructure = json.RawMessage(uprStructure)
	return charter, nil
}

func (r *riskCharterRepository) Update(ctx context.Context, charter *entity.RiskCharter) error {
	if len(charter.UPRStructure) == 0 {
		charter.UPRStructure = json.RawMessage("[]")
	}

	_, err := r.pool.Exec(ctx, `
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
		    upr_structure = $13,
		    status = $14,
		    approved_by = $15,
		    approved_at = $16,
		    updated_at = now()
		WHERE id = $1
	`, charter.ID, charter.OrganizationID, charter.UPRLevel, charter.Period, charter.RiskOwnerName, charter.RiskOwnerUserID,
		charter.RiskTeamName, charter.Scope, charter.LegalBasis, charter.InternalContext, charter.ExternalContext,
		charter.StakeholderSummary, []byte(charter.UPRStructure), charter.Status, charter.ApprovedBy, charter.ApprovedAt,
	)
	if err != nil {
		return fmt.Errorf("update risk charter: %w", err)
	}
	return nil
}

func (r *riskCharterRepository) List(ctx context.Context, filter repository.RiskCharterListFilter) ([]*entity.RiskCharter, int, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	countQuery := `SELECT COUNT(*) FROM risk_charters WHERE 1=1`
	dataQuery := `SELECT id, organization_id, upr_level, period, risk_owner_name, risk_owner_user_id,
		risk_team_name, scope, legal_basis, internal_context, external_context,
		stakeholder_summary, upr_structure, status, created_by, approved_by, approved_at,
		created_at, updated_at FROM risk_charters WHERE 1=1`

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
	if strings.TrimSpace(filter.Status) != "" {
		clause := fmt.Sprintf(" AND status = $%d", argIndex)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Status))
		argIndex++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk charters: %w", err)
	}

	offset := (page - 1) * limit
	dataQuery += fmt.Sprintf(" ORDER BY updated_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk charters: %w", err)
	}
	defer rows.Close()

	items := []*entity.RiskCharter{}
	for rows.Next() {
		item := &entity.RiskCharter{}
		var uprStructure []byte
		if err := rows.Scan(
			&item.ID, &item.OrganizationID, &item.UPRLevel, &item.Period, &item.RiskOwnerName, &item.RiskOwnerUserID,
			&item.RiskTeamName, &item.Scope, &item.LegalBasis, &item.InternalContext, &item.ExternalContext,
			&item.StakeholderSummary, &uprStructure, &item.Status, &item.CreatedBy, &item.ApprovedBy, &item.ApprovedAt,
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk charter: %w", err)
		}
		item.UPRStructure = json.RawMessage(uprStructure)
		items = append(items, item)
	}

	return items, total, nil
}

func (r *riskCharterRepository) ExistsByOrgPeriodLevel(ctx context.Context, organizationID uuid.UUID, period, uprLevel string, excludeID *uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM risk_charters WHERE organization_id = $1 AND period = $2 AND upr_level = $3`
	args := []interface{}{organizationID, period, uprLevel}
	if excludeID != nil {
		query += ` AND id <> $4`
		args = append(args, *excludeID)
	}
	query += `)`

	var exists bool
	if err := r.pool.QueryRow(ctx, query, args...).Scan(&exists); err != nil {
		return false, fmt.Errorf("check risk charter uniqueness: %w", err)
	}
	return exists, nil
}
