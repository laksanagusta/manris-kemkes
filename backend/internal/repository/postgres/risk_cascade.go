package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type riskCascadeRepository struct {
	pool repositoryDB
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

func (r *riskCascadeRepository) Summary(ctx context.Context, orgIDs []uuid.UUID) (repository.RiskCascadeSummary, error) {
	var summary repository.RiskCascadeSummary
	query := `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE rc.status IN ('proposed', 'analyzed')),
			COUNT(*) FILTER (WHERE rc.status IN ('accepted', 'implemented')),
			COUNT(*) FILTER (WHERE rc.cascade_type = 'bottom_up_escalation')
		FROM risk_cascades rc WHERE 1=1
	`
	var args []any
	if len(orgIDs) > 0 {
		query += " AND (rc.source_org_id = ANY($1::uuid[]) OR rc.target_org_id = ANY($1::uuid[]))"
		args = append(args, uuidSliceToStringSlice(orgIDs))
	}
	err := r.pool.QueryRow(ctx, query, args...).Scan(&summary.Total, &summary.Pending, &summary.Approved, &summary.BottomUp)
	if err != nil {
		return summary, fmt.Errorf("summarize risk cascades: %w", err)
	}
	return summary, nil
}

func (r *riskCascadeRepository) List(ctx context.Context, filter repository.RiskCascadeListFilter) ([]*entity.RiskCascade, int, error) {
	const statusLabel = `CASE rc.status
		WHEN 'proposed' THEN 'Menunggu Tinjauan'
		WHEN 'analyzed' THEN 'Sedang Ditinjau'
		WHEN 'accepted' THEN 'Disetujui'
		WHEN 'rejected' THEN 'Ditolak'
		WHEN 'implemented' THEN 'Selesai'
		ELSE rc.status END`
	const cascadeTypeLabel = `CASE rc.cascade_type
		WHEN 'bottom_up_escalation' THEN 'Bottom-up' ELSE 'Top-down' END`
	from := `
		FROM risk_cascades rc
		LEFT JOIN risks sr ON sr.id = rc.source_risk_id
		LEFT JOIN risks tr ON tr.id = rc.target_risk_id
		LEFT JOIN organizations so ON so.id = rc.source_org_id
		LEFT JOIN organizations to_org ON to_org.id = rc.target_org_id
		LEFT JOIN users up ON up.id = rc.proposed_by
		LEFT JOIN users ud ON ud.id = rc.decided_by
		WHERE 1=1
	`

	var args []any
	if len(filter.OrgIDs) > 0 {
		args = append(args, uuidSliceToStringSlice(filter.OrgIDs))
		from += " AND (rc.source_org_id = ANY($1::uuid[]) OR rc.target_org_id = ANY($1::uuid[]))"
	}
	if filter.OrganizationID != nil {
		args = append(args, *filter.OrganizationID)
		arg := len(args)
		from += fmt.Sprintf(" AND (rc.source_org_id = $%d OR rc.target_org_id = $%d)", arg, arg)
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		from += fmt.Sprintf(" AND rc.status = $%d", len(args))
	}
	if filter.CascadeType != "" {
		args = append(args, filter.CascadeType)
		from += fmt.Sprintf(" AND rc.cascade_type = $%d", len(args))
	}
	if filter.Query != "" {
		args = append(args, filter.Query)
		from += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM unnest(ARRAY[
				sr.code, sr.title, tr.code, tr.title, so.name, to_org.name,
				rc.analysis_note, rc.decision_note, rc.cascade_type, rc.status, %s, %s
			]) AS value
			WHERE strpos(lower(value), lower($%d)) > 0
		)`, statusLabel, cascadeTypeLabel, len(args))
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) "+from, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count risk cascades: %w", err)
	}
	page := max(1, filter.Page)
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	if page > max(1, (total+limit-1)/limit) {
		return []*entity.RiskCascade{}, total, nil
	}
	offset := (page - 1) * limit
	order := collectionOrderBy(filter.SortBy, filter.SortOrder, "rc.created_at", "rc.id", map[string]string{
		"created_at":          "rc.created_at",
		"risk":                "NULLIF(sr.title, '')",
		"source_organization": "NULLIF(so.name, '')",
		"cascade_type":        cascadeTypeLabel,
		"status":              statusLabel,
		"adoption_type":       "NULLIF(rc.adoption_type, '')",
	})
	dataQuery := `
		SELECT rc.id, rc.source_risk_id, rc.target_risk_id, rc.source_org_id, rc.target_org_id,
			rc.cascade_type, COALESCE(rc.adoption_type, ''), rc.status, rc.analysis_note, rc.decision_note,
			rc.proposed_by, rc.decided_by, rc.decided_at, rc.created_at,
			COALESCE(sr.code, ''), COALESCE(sr.title, ''),
			COALESCE(tr.code, ''), COALESCE(tr.title, ''),
			COALESCE(so.name, ''), COALESCE(to_org.name, ''),
			COALESCE(up.name, ''), COALESCE(ud.name, '')
	` + from + " ORDER BY " + order + fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
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
