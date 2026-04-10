package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// lessonRepository is the PostgreSQL implementation of repository.LessonRepository
type lessonRepository struct {
	pool *pgxpool.Pool
}

// NewLessonRepository creates a new lesson repository
func NewLessonRepository(pool *pgxpool.Pool) repository.LessonRepository {
	return &lessonRepository{pool: pool}
}

// Create inserts a new lesson
func (r *lessonRepository) Create(ctx context.Context, lesson *entity.Lesson) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO lessons_learned (title, description, source_type, source_ref, success_factors,
		       failure_factors, recommendations, tags, author_id, organization_id, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
		 RETURNING id, created_at`,
		lesson.Title, lesson.Description, lesson.SourceType, lesson.SourceRef,
		lesson.SuccessFactors, lesson.FailureFactors, lesson.Recommendations,
		lesson.Tags, lesson.AuthorID, lesson.OrganizationID,
	).Scan(&lesson.ID, &lesson.CreatedAt)

	if err != nil {
		return fmt.Errorf("create lesson: %w", err)
	}

	return nil
}

// GetByID retrieves a lesson by ID
func (r *lessonRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Lesson, error) {
	lesson := &entity.Lesson{}
	query := `SELECT l.id, l.title, l.description, l.source_type, l.source_ref,
		       l.success_factors, l.failure_factors, l.recommendations, l.tags,
		       l.author_id, u.name as author_name, l.organization_id, l.created_at
		FROM lessons_learned l
		LEFT JOIN users u ON l.author_id = u.id
		WHERE l.id = $1`
	args := []interface{}{id}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND l.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
	}
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&lesson.ID, &lesson.Title, &lesson.Description, &lesson.SourceType,
		&lesson.SourceRef, &lesson.SuccessFactors, &lesson.FailureFactors,
		&lesson.Recommendations, &lesson.Tags, &lesson.AuthorID,
		&lesson.AuthorName, &lesson.OrganizationID, &lesson.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("find lesson by id: %w", err)
	}

	return lesson, nil
}

// Update updates a lesson
func (r *lessonRepository) Update(ctx context.Context, lesson *entity.Lesson) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE lessons_learned SET title=$2, description=$3, source_type=$4, source_ref=$5,
		       success_factors=$6, failure_factors=$7, recommendations=$8, tags=$9
		 WHERE id=$1`,
		lesson.ID, lesson.Title, lesson.Description, lesson.SourceType, lesson.SourceRef,
		lesson.SuccessFactors, lesson.FailureFactors, lesson.Recommendations, lesson.Tags,
	)

	if err != nil {
		return fmt.Errorf("update lesson: %w", err)
	}

	return nil
}

// Delete deletes a lesson
func (r *lessonRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM lessons_learned WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete lesson: %w", err)
	}
	return nil
}

// List retrieves lessons with optional filters
func (r *lessonRepository) List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Lesson, error) {
	query := `
		SELECT l.id, l.title, l.description, l.source_type, l.source_ref,
		       l.success_factors, l.failure_factors, l.recommendations, l.tags,
		       l.author_id, u.name as author_name, l.organization_id, l.created_at
		FROM lessons_learned l
		LEFT JOIN users u ON l.author_id = u.id
		WHERE 1=1`

	args := []interface{}{}
	argIdx := 1

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND l.organization_id = ANY($%d)", argIdx)
		args = append(args, orgIDs)
		argIdx++
	}

	query += " ORDER BY l.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list lessons: %w", err)
	}
	defer rows.Close()

	var lessons []*entity.Lesson
	for rows.Next() {
		var lesson entity.Lesson
		if err := rows.Scan(
			&lesson.ID, &lesson.Title, &lesson.Description, &lesson.SourceType,
			&lesson.SourceRef, &lesson.SuccessFactors, &lesson.FailureFactors,
			&lesson.Recommendations, &lesson.Tags, &lesson.AuthorID,
			&lesson.AuthorName, &lesson.OrganizationID, &lesson.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan lesson: %w", err)
		}
		lessons = append(lessons, &lesson)
	}

	return lessons, nil
}

// GetDashboard retrieves dashboard metrics for lessons
func (r *lessonRepository) GetDashboard(ctx context.Context, orgIDs []uuid.UUID) (map[string]interface{}, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE source_type = 'incident') as from_incidents,
			COUNT(*) FILTER (WHERE source_type = 'risk') as from_risks
		FROM lessons_learned
		WHERE 1=1`

	args := []interface{}{}
	if len(orgIDs) > 0 {
		query += " AND organization_id = ANY($1)"
		args = append(args, orgIDs)
	}

	var total, fromIncidents, fromRisks int
	err := r.pool.QueryRow(ctx, query, args...).Scan(&total, &fromIncidents, &fromRisks)
	if err != nil {
		return nil, fmt.Errorf("lesson dashboard: %w", err)
	}

	return map[string]interface{}{
		"total":          total,
		"from_incidents": fromIncidents,
		"from_risks":     fromRisks,
	}, nil
}
