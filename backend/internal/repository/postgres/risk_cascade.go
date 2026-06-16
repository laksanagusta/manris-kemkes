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

type riskCascadeRepository struct {
	pool *pgxpool.Pool
}

func NewRiskCascadeRepository(pool *pgxpool.Pool) repository.RiskCascadeRepository {
	return &riskCascadeRepository{pool: pool}
}

func uuidSliceToStringSlice(ids []uuid.UUID) []string {
	out := make([]string, len(ids))
	for i, id := range ids {
		out[i] = id.String()
	}
	return out
}

func (r *riskCascadeRepository) Create(ctx context.Context, cascade *entity.RiskCascade) error {
	query := `
		INSERT INTO risk_cascades (
			source_risk_id, target_risk_id, source_org_id, target_org_id,
			cascade_type, adoption_type, status, analysis_note, decision_note,
			proposed_by, decided_by, decided_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id, created_at
	`
	if err := r.pool.QueryRow(ctx, query,
		cascade.SourceRiskID,
		cascade.TargetRiskID,
		cascade.SourceOrgID,
		cascade.TargetOrgID,
		cascade.CascadeType,
		cascade.AdoptionType,
		cascade.Status,
		cascade.AnalysisNote,
		cascade.DecisionNote,
		cascade.ProposedBy,
		cascade.DecidedBy,
		cascade.DecidedAt,
	).Scan(&cascade.ID, &cascade.CreatedAt); err != nil {
		return fmt.Errorf("create risk cascade: %w", err)
	}
	return nil
}

func (r *riskCascadeRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCascade, error) {
	query := `
		SELECT rc.id, rc.source_risk_id, rc.target_risk_id, rc.source_org_id, rc.target_org_id,
			rc.cascade_type, COALESCE(rc.adoption_type, ''), rc.status, rc.analysis_note, rc.decision_note,
			rc.proposed_by, rc.decided_by, rc.decided_at, rc.created_at,
			COALESCE(sr.code, ''), COALESCE(sr.title, ''),
			COALESCE(tr.code, ''), COALESCE(tr.title, ''),
			COALESCE(so.name, ''), COALESCE(to_org.name, ''),
			COALESCE(up.name, ''), COALESCE(ud.name, '')
		FROM risk_cascades rc
		LEFT JOIN risks sr ON sr.id = rc.source_risk_id
		LEFT JOIN risks tr ON tr.id = rc.target_risk_id
		LEFT JOIN organizations so ON so.id = rc.source_org_id
		LEFT JOIN organizations to_org ON to_org.id = rc.target_org_id
		LEFT JOIN users up ON up.id = rc.proposed_by
		LEFT JOIN users ud ON ud.id = rc.decided_by
		WHERE rc.id = $1
	`
	cascade := &entity.RiskCascade{}
	if err := r.pool.QueryRow(ctx, query, id).Scan(
		&cascade.ID,
		&cascade.SourceRiskID,
		&cascade.TargetRiskID,
		&cascade.SourceOrgID,
		&cascade.TargetOrgID,
		&cascade.CascadeType,
		&cascade.AdoptionType,
		&cascade.Status,
		&cascade.AnalysisNote,
		&cascade.DecisionNote,
		&cascade.ProposedBy,
		&cascade.DecidedBy,
		&cascade.DecidedAt,
		&cascade.CreatedAt,
		&cascade.SourceRiskCode,
		&cascade.SourceRiskTitle,
		&cascade.TargetRiskCode,
		&cascade.TargetRiskTitle,
		&cascade.SourceOrgName,
		&cascade.TargetOrgName,
		&cascade.ProposedByName,
		&cascade.DecidedByName,
	); err != nil {
		return nil, fmt.Errorf("get risk cascade by id: %w", err)
	}
	return cascade, nil
}

func (r *riskCascadeRepository) Update(ctx context.Context, cascade *entity.RiskCascade) error {
	query := `
		UPDATE risk_cascades
		SET target_risk_id = $2,
			adoption_type = $3,
			status = $4,
			analysis_note = $5,
			decision_note = $6,
			decided_by = $7,
			decided_at = $8
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		cascade.ID,
		cascade.TargetRiskID,
		cascade.AdoptionType,
		cascade.Status,
		cascade.AnalysisNote,
		cascade.DecisionNote,
		cascade.DecidedBy,
		cascade.DecidedAt,
	)
	if err != nil {
		return fmt.Errorf("update risk cascade: %w", err)
	}
	return nil
}

func (r *riskCascadeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM risk_cascades WHERE id = $1 AND status = 'proposed'", id)
	if err != nil {
		return fmt.Errorf("delete risk cascade: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("hapus kaskade risiko: tidak ditemukan atau tidak dapat dihapus")
	}
	return nil
}

func (r *riskCascadeRepository) List(ctx context.Context, filter repository.RiskCascadeListFilter) ([]*entity.RiskCascade, int, error) {
	fromClause := `
		FROM risk_cascades rc
		LEFT JOIN risks sr ON sr.id = rc.source_risk_id
		LEFT JOIN risks tr ON tr.id = rc.target_risk_id
		LEFT JOIN organizations so ON so.id = rc.source_org_id
		LEFT JOIN organizations to_org ON to_org.id = rc.target_org_id
		LEFT JOIN users up ON up.id = rc.proposed_by
		LEFT JOIN users ud ON ud.id = rc.decided_by
	`
	whereClause := " WHERE 1=1"
	countQuery := "SELECT COUNT(*) " + fromClause + whereClause
	dataQuery := `
		SELECT rc.id, rc.source_risk_id, rc.target_risk_id, rc.source_org_id, rc.target_org_id,
			rc.cascade_type, COALESCE(rc.adoption_type, ''), rc.status, rc.analysis_note, rc.decision_note,
			rc.proposed_by, rc.decided_by, rc.decided_at, rc.created_at,
			COALESCE(sr.code, ''), COALESCE(sr.title, ''),
			COALESCE(tr.code, ''), COALESCE(tr.title, ''),
			COALESCE(so.name, ''), COALESCE(to_org.name, ''),
			COALESCE(up.name, ''), COALESCE(ud.name, '')
		` + fromClause + whereClause

	var (
		args   []any
		argPos = 1
	)

	if len(filter.OrgIDs) > 0 {
		clause := fmt.Sprintf(" AND (rc.source_org_id = ANY($%d::uuid[]) OR rc.target_org_id = ANY($%d::uuid[]))", argPos, argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, uuidSliceToStringSlice(filter.OrgIDs))
		argPos++
	}
	if strings.TrimSpace(filter.Status) != "" {
		clause := fmt.Sprintf(" AND rc.status = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Status))
		argPos++
	}
	if strings.TrimSpace(filter.CascadeType) != "" {
		clause := fmt.Sprintf(" AND rc.cascade_type = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.CascadeType))
		argPos++
	}
	if strings.TrimSpace(filter.Query) != "" {
		pattern := "%" + strings.TrimSpace(filter.Query) + "%"
		clause := fmt.Sprintf(` AND (
			sr.code ILIKE $%d OR sr.title ILIKE $%d OR
			tr.code ILIKE $%d OR tr.title ILIKE $%d OR
			so.name ILIKE $%d OR to_org.name ILIKE $%d OR
			rc.analysis_note ILIKE $%d OR rc.decision_note ILIKE $%d
		)`, argPos, argPos, argPos, argPos, argPos, argPos, argPos, argPos)
		countQuery += clause
		dataQuery += clause
		for i := 0; i < 8; i++ {
			args = append(args, pattern)
		}
		argPos += 8
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk cascades: %w", err)
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
	dataQuery += fmt.Sprintf(" ORDER BY rc.created_at DESC LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list risk cascades: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.RiskCascade, 0)
	for rows.Next() {
		cascade := &entity.RiskCascade{}
		if err := rows.Scan(
			&cascade.ID,
			&cascade.SourceRiskID,
			&cascade.TargetRiskID,
			&cascade.SourceOrgID,
			&cascade.TargetOrgID,
			&cascade.CascadeType,
			&cascade.AdoptionType,
			&cascade.Status,
			&cascade.AnalysisNote,
			&cascade.DecisionNote,
			&cascade.ProposedBy,
			&cascade.DecidedBy,
			&cascade.DecidedAt,
			&cascade.CreatedAt,
			&cascade.SourceRiskCode,
			&cascade.SourceRiskTitle,
			&cascade.TargetRiskCode,
			&cascade.TargetRiskTitle,
			&cascade.SourceOrgName,
			&cascade.TargetOrgName,
			&cascade.ProposedByName,
			&cascade.DecidedByName,
		); err != nil {
			return nil, 0, fmt.Errorf("scan risk cascade: %w", err)
		}
		items = append(items, cascade)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate risk cascades: %w", err)
	}

	return items, total, nil
}
