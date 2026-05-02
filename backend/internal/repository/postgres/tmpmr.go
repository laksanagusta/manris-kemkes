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

type tmpmrRepository struct {
	pool *pgxpool.Pool
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

func (r *tmpmrRepository) List(ctx context.Context, filter repository.TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error) {
	countQuery := `SELECT COUNT(*) FROM tmpmr_assessments WHERE 1=1`
	dataQuery := `
		SELECT id, organization_id, period, assessor_id, reviewer_id, status, score, maturity_level, review_note, created_at, updated_at
		FROM tmpmr_assessments
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
		return nil, 0, fmt.Errorf("count tmpmr assessments: %w", err)
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
