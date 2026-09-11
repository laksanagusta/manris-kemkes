package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

type riskCharterScanner interface {
	Scan(dest ...any) error
}

const riskCharterColumns = `
	id, title, organization_id, upr_level, period,
	scope, legal_basis, legal_bases, internal_context, external_context,
	stakeholder_summary, stakeholders, upr_structure, status,
	version_group_id, previous_version_id, version_number, is_current,
	revision_reason, created_by, approved_by, approved_at,
	finalized_by, finalized_at, created_at, updated_at
`

func scanRiskCharter(row riskCharterScanner) (*entity.RiskCharter, error) {
	charter := &entity.RiskCharter{}
	var legalBasesJSON, stakeholdersJSON, uprStructureJSON []byte
	if err := row.Scan(
		&charter.ID,
		&charter.Title,
		&charter.OrganizationID,
		&charter.UPRLevel,
		&charter.Period,
		&charter.Scope,
		&charter.LegalBasis,
		&legalBasesJSON,
		&charter.InternalContext,
		&charter.ExternalContext,
		&charter.StakeholderSummary,
		&stakeholdersJSON,
		&uprStructureJSON,
		&charter.Status,
		&charter.VersionGroupID,
		&charter.PreviousVersionID,
		&charter.VersionNumber,
		&charter.IsCurrent,
		&charter.RevisionReason,
		&charter.CreatedBy,
		&charter.ApprovedBy,
		&charter.ApprovedAt,
		&charter.FinalizedBy,
		&charter.FinalizedAt,
		&charter.CreatedAt,
		&charter.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(legalBasesJSON, &charter.LegalBases); err != nil {
		return nil, fmt.Errorf("decode legal bases: %w", err)
	}
	if err := json.Unmarshal(stakeholdersJSON, &charter.Stakeholders); err != nil {
		return nil, fmt.Errorf("decode stakeholders: %w", err)
	}
	if err := json.Unmarshal(uprStructureJSON, &charter.UPRStructure); err != nil {
		return nil, fmt.Errorf("decode UPR structure: %w", err)
	}
	return charter, nil
}

func encodeRiskCharterCollections(charter *entity.RiskCharter) ([]byte, []byte, []byte, error) {
	legalBases, err := json.Marshal(charter.LegalBases)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("encode legal bases: %w", err)
	}
	stakeholders, err := json.Marshal(charter.Stakeholders)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("encode stakeholders: %w", err)
	}
	uprStructure, err := json.Marshal(charter.UPRStructure)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("encode UPR structure: %w", err)
	}
	return legalBases, stakeholders, uprStructure, nil
}

func (r *riskCharterRepository) Create(ctx context.Context, charter *entity.RiskCharter) error {
	legalBases, stakeholders, uprStructure, err := encodeRiskCharterCollections(charter)
	if err != nil {
		return err
	}
	query := `
		INSERT INTO risk_charters (
			title, organization_id, upr_level, period,
			risk_owner_name, risk_team_name, scope, legal_basis, legal_bases,
			internal_context, external_context, stakeholder_summary, stakeholders,
			upr_structure, status, version_group_id, previous_version_id,
			version_number, is_current, revision_reason, created_by
		) VALUES (
			$1,$2,$3,$4,'','',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
		)
		RETURNING id, created_at, updated_at
	`
	if err := r.pool.QueryRow(ctx, query,
		charter.Title,
		charter.OrganizationID,
		charter.UPRLevel,
		charter.Period,
		charter.Scope,
		charter.LegalBasis,
		legalBases,
		charter.InternalContext,
		charter.ExternalContext,
		charter.StakeholderSummary,
		stakeholders,
		uprStructure,
		charter.Status,
		charter.VersionGroupID,
		charter.PreviousVersionID,
		charter.VersionNumber,
		charter.IsCurrent,
		charter.RevisionReason,
		charter.CreatedBy,
	).Scan(&charter.ID, &charter.CreatedAt, &charter.UpdatedAt); err != nil {
		return fmt.Errorf("create risk charter: %w", err)
	}
	return nil
}

func (r *riskCharterRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCharter, error) {
	charter, err := scanRiskCharter(r.pool.QueryRow(ctx, `SELECT `+riskCharterColumns+` FROM risk_charters WHERE id = $1`, id))
	if err != nil {
		return nil, fmt.Errorf("get risk charter by id: %w", err)
	}
	return charter, nil
}

func (r *riskCharterRepository) UpdateDraft(ctx context.Context, charter *entity.RiskCharter) error {
	legalBases, stakeholders, uprStructure, err := encodeRiskCharterCollections(charter)
	if err != nil {
		return err
	}
	query := `
		UPDATE risk_charters
		SET title = $2, scope = $3, legal_basis = $4, legal_bases = $5,
			internal_context = $6, external_context = $7,
			stakeholder_summary = $8, stakeholders = $9, upr_structure = $10,
			updated_at = now()
		WHERE id = $1 AND status = 'draft'
		RETURNING updated_at
	`
	if err := r.pool.QueryRow(ctx, query,
		charter.ID,
		charter.Title,
		charter.Scope,
		charter.LegalBasis,
		legalBases,
		charter.InternalContext,
		charter.ExternalContext,
		charter.StakeholderSummary,
		stakeholders,
		uprStructure,
	).Scan(&charter.UpdatedAt); err != nil {
		return fmt.Errorf("update risk charter draft: %w", err)
	}
	return nil
}

func (r *riskCharterRepository) FindExistingByOrgPeriodLevel(ctx context.Context, organizationID uuid.UUID, period, uprLevel string) (*entity.RiskCharter, error) {
	query := `SELECT ` + riskCharterColumns + `
		FROM risk_charters
		WHERE organization_id = $1 AND period = $2 AND upr_level = $3
		  AND (is_current OR status = 'draft')
		ORDER BY (status = 'draft') DESC, is_current DESC, version_number DESC
		LIMIT 1`
	charter, err := scanRiskCharter(r.pool.QueryRow(ctx, query, organizationID, period, uprLevel))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find existing risk charter: %w", err)
	}
	return charter, nil
}

func (r *riskCharterRepository) List(ctx context.Context, filter repository.RiskCharterListFilter) ([]*entity.RiskCharter, int, error) {
	countQuery := `SELECT COUNT(*) FROM risk_charters WHERE is_current = true`
	dataQuery := `SELECT ` + riskCharterColumns + ` FROM risk_charters WHERE is_current = true`
	args := make([]any, 0, 5)
	argPos := 1
	appendClause := func(clause string, value any) {
		formatted := fmt.Sprintf(clause, argPos)
		countQuery += formatted
		dataQuery += formatted
		args = append(args, value)
		argPos++
	}
	if filter.OrganizationID != nil {
		appendClause(" AND organization_id = $%d", *filter.OrganizationID)
	}
	if period := strings.TrimSpace(filter.Period); period != "" {
		appendClause(" AND period = $%d", period)
	}
	if query := strings.TrimSpace(filter.Query); query != "" {
		appendClause(" AND title ILIKE '%%' || $%d || '%%'", query)
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
		charter, scanErr := scanRiskCharter(rows)
		if scanErr != nil {
			return nil, 0, fmt.Errorf("scan risk charter: %w", scanErr)
		}
		items = append(items, charter)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate risk charters: %w", err)
	}
	return items, total, nil
}

func (r *riskCharterRepository) Finalize(ctx context.Context, charter *entity.RiskCharter) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin finalize risk charter transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `
		UPDATE risk_charters
		SET is_current = false,
			status = CASE WHEN status = 'active' THEN 'superseded' ELSE status END,
			updated_at = now()
		WHERE version_group_id = $1 AND id <> $2 AND is_current = true
	`, charter.VersionGroupID, charter.ID); err != nil {
		return fmt.Errorf("supersede previous risk charter version: %w", err)
	}
	if err := tx.QueryRow(ctx, `
		UPDATE risk_charters
		SET status = 'active', is_current = true,
			finalized_by = $2, finalized_at = $3, updated_at = now()
		WHERE id = $1 AND status = 'draft'
		RETURNING status, is_current, finalized_at, updated_at
	`, charter.ID, charter.FinalizedBy, charter.FinalizedAt).Scan(
		&charter.Status,
		&charter.IsCurrent,
		&charter.FinalizedAt,
		&charter.UpdatedAt,
	); err != nil {
		return fmt.Errorf("finalize risk charter: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit risk charter finalization: %w", err)
	}
	return nil
}

func (r *riskCharterRepository) CreateRevision(ctx context.Context, source *entity.RiskCharter, revision *entity.RiskCharter) error {
	legalBases, stakeholders, uprStructure, err := encodeRiskCharterCollections(revision)
	if err != nil {
		return err
	}
	query := `
		INSERT INTO risk_charters (
			title, organization_id, upr_level, period, risk_owner_name, risk_team_name,
			scope, legal_basis, legal_bases, internal_context, external_context,
			stakeholder_summary, stakeholders, upr_structure, status,
			version_group_id, previous_version_id, version_number, is_current,
			revision_reason, created_by
		) VALUES (
			$1,$2,$3,$4,'','',$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,$14,$15,false,$16,$17
		)
		RETURNING id, status, created_at, updated_at
	`
	if err := r.pool.QueryRow(ctx, query,
		revision.Title,
		revision.OrganizationID,
		revision.UPRLevel,
		revision.Period,
		revision.Scope,
		revision.LegalBasis,
		legalBases,
		revision.InternalContext,
		revision.ExternalContext,
		revision.StakeholderSummary,
		stakeholders,
		uprStructure,
		revision.VersionGroupID,
		revision.PreviousVersionID,
		revision.VersionNumber,
		revision.RevisionReason,
		revision.CreatedBy,
	).Scan(&revision.ID, &revision.Status, &revision.CreatedAt, &revision.UpdatedAt); err != nil {
		return fmt.Errorf("create risk charter revision from %s: %w", source.ID, err)
	}
	return nil
}

func (r *riskCharterRepository) ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.RiskCharter, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+riskCharterColumns+`
		FROM risk_charters WHERE version_group_id = $1
		ORDER BY version_number DESC, created_at DESC`, versionGroupID)
	if err != nil {
		return nil, fmt.Errorf("list risk charter versions: %w", err)
	}
	defer rows.Close()
	items := make([]*entity.RiskCharter, 0)
	for rows.Next() {
		charter, scanErr := scanRiskCharter(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan risk charter version: %w", scanErr)
		}
		items = append(items, charter)
	}
	return items, rows.Err()
}

func (r *riskCharterRepository) Archive(ctx context.Context, id uuid.UUID) error {
	command, err := r.pool.Exec(ctx, `UPDATE risk_charters
		SET status = 'archived', updated_at = now()
		WHERE id = $1 AND status = 'active' AND is_current = true`, id)
	if err != nil {
		return fmt.Errorf("archive risk charter: %w", err)
	}
	if command.RowsAffected() != 1 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *riskCharterRepository) Restore(ctx context.Context, charter *entity.RiskCharter) error {
	if err := r.pool.QueryRow(ctx, `UPDATE risk_charters
		SET status = 'active', is_current = true, updated_at = now()
		WHERE id = $1 AND status = 'archived'
		  AND NOT EXISTS (
			SELECT 1 FROM risk_charters existing
			WHERE existing.organization_id = $2
			  AND existing.period = $3
			  AND existing.upr_level = $4
			  AND existing.is_current = true
			  AND existing.id <> $1
		  )
		RETURNING status, is_current, updated_at`,
		charter.ID,
		charter.OrganizationID,
		charter.Period,
		charter.UPRLevel,
	).Scan(
		&charter.Status,
		&charter.IsCurrent,
		&charter.UpdatedAt,
	); err != nil {
		return fmt.Errorf("restore risk charter: %w", err)
	}
	return nil
}

func (r *riskCharterRepository) DeleteDraft(ctx context.Context, id uuid.UUID) error {
	command, err := r.pool.Exec(ctx, `DELETE FROM risk_charters WHERE id = $1 AND status = 'draft'`, id)
	if err != nil {
		return fmt.Errorf("delete risk charter draft: %w", err)
	}
	if command.RowsAffected() != 1 {
		return pgx.ErrNoRows
	}
	return nil
}
