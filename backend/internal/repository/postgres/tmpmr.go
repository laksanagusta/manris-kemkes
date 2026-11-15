package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type tmpmrRepository struct {
	pool repositoryDB
}

func NewTMPMRRepository(pool *pgxpool.Pool) repository.TMPMRRepository {
	return &tmpmrRepository{pool: pool}
}

func (r *tmpmrRepository) Create(ctx context.Context, assessment *entity.TMPMRAssessment) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tmpmr create tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := tx.QueryRow(ctx, `
		INSERT INTO tmpmr_assessments (
			organization_id, period, assessor_id, reviewer_id, status, score, maturity_level, review_note
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, created_at, updated_at
	`, assessment.OrganizationID, assessment.Period, assessment.AssessorID, assessment.ReviewerID, assessment.Status, assessment.Score, assessment.MaturityLevel, assessment.ReviewNote).Scan(
		&assessment.ID, &assessment.CreatedAt, &assessment.UpdatedAt,
	); err != nil {
		return fmt.Errorf("create tmpmr assessment: %w", err)
	}

	for i := range assessment.Items {
		item := &assessment.Items[i]
		item.AssessmentID = assessment.ID
		if item.ID == uuid.Nil {
			item.ID = uuid.New()
		}
		if err := tx.QueryRow(ctx, `
			INSERT INTO tmpmr_items (
				id, assessment_id, dimension, question, score, evidence_url, notes
			) VALUES ($1,$2,$3,$4,$5,$6,$7)
			RETURNING created_at, updated_at
		`, item.ID, item.AssessmentID, item.Dimension, item.Question, item.Score, item.EvidenceURL, item.Notes).Scan(
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return fmt.Errorf("create tmpmr item: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tmpmr create tx: %w", err)
	}
	return nil
}

func (r *tmpmrRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.TMPMRAssessment, error) {
	assessment := &entity.TMPMRAssessment{}
	if err := r.pool.QueryRow(ctx, `
		SELECT id, organization_id, period, assessor_id, reviewer_id, status, score, maturity_level, review_note, created_at, updated_at
		FROM tmpmr_assessments
		WHERE id = $1
	`, id).Scan(
		&assessment.ID,
		&assessment.OrganizationID,
		&assessment.Period,
		&assessment.AssessorID,
		&assessment.ReviewerID,
		&assessment.Status,
		&assessment.Score,
		&assessment.MaturityLevel,
		&assessment.ReviewNote,
		&assessment.CreatedAt,
		&assessment.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get tmpmr assessment by id: %w", err)
	}

	items, err := r.listItems(ctx, assessment.ID)
	if err != nil {
		return nil, err
	}
	assessment.Items = items
	return assessment, nil
}

func (r *tmpmrRepository) Update(ctx context.Context, assessment *entity.TMPMRAssessment) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tmpmr update tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := tx.QueryRow(ctx, `
		UPDATE tmpmr_assessments
		SET organization_id = $2,
			period = $3,
			assessor_id = $4,
			reviewer_id = $5,
			status = $6,
			score = $7,
			maturity_level = $8,
			review_note = $9,
			updated_at = now()
		WHERE id = $1
		RETURNING updated_at
	`, assessment.ID, assessment.OrganizationID, assessment.Period, assessment.AssessorID, assessment.ReviewerID, assessment.Status, assessment.Score, assessment.MaturityLevel, assessment.ReviewNote).Scan(&assessment.UpdatedAt); err != nil {
		return fmt.Errorf("update tmpmr assessment: %w", err)
	}

	keepIDs := make([]uuid.UUID, 0, len(assessment.Items))
	for i := range assessment.Items {
		item := &assessment.Items[i]
		item.AssessmentID = assessment.ID
		if item.ID == uuid.Nil {
			item.ID = uuid.New()
		}
		keepIDs = append(keepIDs, item.ID)
		if err := tx.QueryRow(ctx, `
			INSERT INTO tmpmr_items (
				id, assessment_id, dimension, question, score, evidence_url, notes
			) VALUES ($1,$2,$3,$4,$5,$6,$7)
			ON CONFLICT (id) DO UPDATE SET
				assessment_id = EXCLUDED.assessment_id,
				dimension = EXCLUDED.dimension,
				question = EXCLUDED.question,
				score = EXCLUDED.score,
				evidence_url = EXCLUDED.evidence_url,
				notes = EXCLUDED.notes,
				updated_at = now()
			RETURNING created_at, updated_at
		`, item.ID, item.AssessmentID, item.Dimension, item.Question, item.Score, item.EvidenceURL, item.Notes).Scan(
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return fmt.Errorf("upsert tmpmr item: %w", err)
		}
	}

	if len(keepIDs) > 0 {
		if _, err := tx.Exec(ctx, `
			DELETE FROM tmpmr_items
			WHERE assessment_id = $1
			  AND NOT (id = ANY($2))
		`, assessment.ID, keepIDs); err != nil {
			return fmt.Errorf("prune tmpmr items: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tmpmr update tx: %w", err)
	}
	return nil
}

func (r *tmpmrRepository) Summary(ctx context.Context, organizationID *uuid.UUID) (repository.TMPMRSummary, error) {
	var summary repository.TMPMRSummary
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'draft'),
			COUNT(*) FILTER (WHERE status = 'submitted'), COUNT(*) FILTER (WHERE status = 'approved'),
			COALESCE(array_agg(DISTINCT period ORDER BY period DESC) FILTER (WHERE period <> ''), ARRAY[]::text[])
		FROM tmpmr_assessments
		WHERE $1::uuid IS NULL OR organization_id = $1
	`, organizationID).Scan(&summary.Total, &summary.Draft, &summary.Submitted, &summary.Approved, &summary.Periods)
	if err != nil {
		return summary, fmt.Errorf("summarize tmpmr assessments: %w", err)
	}
	return summary, nil
}

func (r *tmpmrRepository) List(ctx context.Context, filter repository.TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error) {
	from := `
		FROM tmpmr_assessments a
		LEFT JOIN organizations o ON o.id = a.organization_id
		WHERE 1=1
	`
	var args []any
	if filter.OrganizationID != nil {
		args = append(args, *filter.OrganizationID)
		from += fmt.Sprintf(" AND a.organization_id = $%d", len(args))
	}
	if filter.Period != "" {
		args = append(args, filter.Period)
		from += fmt.Sprintf(" AND a.period = $%d", len(args))
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		from += fmt.Sprintf(" AND a.status = $%d", len(args))
	}
	if filter.Query != "" {
		args = append(args, filter.Query)
		from += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM unnest(ARRAY[o.name, a.period, a.status, a.maturity_level, a.score::text]) AS value
			WHERE strpos(lower(value), lower($%d)) > 0
		)`, len(args))
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) "+from, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count tmpmr assessments: %w", err)
	}

	page := max(1, filter.Page)
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	if page > max(1, (total+limit-1)/limit) {
		return []*entity.TMPMRAssessment{}, total, nil
	}
	offset := (page - 1) * limit
	order := collectionOrderBy(filter.SortBy, filter.SortOrder, "a.created_at", "a.id", map[string]string{
		"created_at":   "a.created_at",
		"period":       "a.period",
		"organization": "o.name",
		"score":        "a.score",
		"maturity":     "NULLIF(a.maturity_level, '')",
		"status":       "a.status",
		"updated_at":   "a.updated_at",
	})
	dataQuery := `
		SELECT a.id, a.organization_id, a.period, a.assessor_id, a.reviewer_id,
			a.status, a.score, a.maturity_level, a.review_note, a.created_at, a.updated_at,
			COALESCE(o.name, '')
	` + from + " ORDER BY " + order + fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list tmpmr assessments: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.TMPMRAssessment, 0)
	for rows.Next() {
		assessment := &entity.TMPMRAssessment{}
		if err := rows.Scan(
			&assessment.ID,
			&assessment.OrganizationID,
			&assessment.Period,
			&assessment.AssessorID,
			&assessment.ReviewerID,
			&assessment.Status,
			&assessment.Score,
			&assessment.MaturityLevel,
			&assessment.ReviewNote,
			&assessment.CreatedAt,
			&assessment.UpdatedAt,
			&assessment.OrganizationName,
		); err != nil {
			return nil, 0, fmt.Errorf("scan tmpmr assessment: %w", err)
		}
		items = append(items, assessment)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate tmpmr assessments: %w", err)
	}

	return items, total, nil
}

func (r *tmpmrRepository) ExistsByOrgPeriod(ctx context.Context, organizationID uuid.UUID, period string, excludeID *uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM tmpmr_assessments
			WHERE organization_id = $1
			  AND period = $2
			  AND ($3::uuid IS NULL OR id <> $3)
		)
	`

	var exists bool
	if err := r.pool.QueryRow(ctx, query, organizationID, period, excludeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("exists tmpmr assessment: %w", err)
	}
	return exists, nil
}

func (r *tmpmrRepository) listItems(ctx context.Context, assessmentID uuid.UUID) ([]entity.TMPMRItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, assessment_id, dimension, question, score, evidence_url, notes, created_at, updated_at
		FROM tmpmr_items
		WHERE assessment_id = $1
		ORDER BY CASE dimension
			WHEN 'governance' THEN 1
			WHEN 'context_criteria' THEN 2
			WHEN 'risk_assessment' THEN 3
			WHEN 'risk_treatment' THEN 4
			WHEN 'monitoring_review' THEN 5
			WHEN 'recording_reporting' THEN 6
			ELSE 99
		END, created_at ASC
	`, assessmentID)
	if err != nil {
		return nil, fmt.Errorf("list tmpmr items: %w", err)
	}
	defer rows.Close()

	items := make([]entity.TMPMRItem, 0)
	for rows.Next() {
		item := entity.TMPMRItem{}
		if err := rows.Scan(
			&item.ID,
			&item.AssessmentID,
			&item.Dimension,
			&item.Question,
			&item.Score,
			&item.EvidenceURL,
			&item.Notes,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan tmpmr item: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tmpmr items: %w", err)
	}

	return items, nil
}

var _ interface {
	Create(ctx context.Context, assessment *entity.TMPMRAssessment) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.TMPMRAssessment, error)
	Update(ctx context.Context, assessment *entity.TMPMRAssessment) error
	List(ctx context.Context, filter repository.TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error)
	ExistsByOrgPeriod(ctx context.Context, organizationID uuid.UUID, period string, excludeID *uuid.UUID) (bool, error)
} = &tmpmrRepository{}
