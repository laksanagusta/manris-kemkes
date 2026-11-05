package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type FeedbackRepository struct{ pool *pgxpool.Pool }

func NewFeedbackRepository(pool *pgxpool.Pool) *FeedbackRepository {
	return &FeedbackRepository{pool: pool}
}

func (r *FeedbackRepository) Create(ctx context.Context, input *entity.Feedback) (*entity.Feedback, error) {
	result := &entity.Feedback{RequestID: input.RequestID}
	err := r.pool.QueryRow(ctx, `INSERT INTO user_feedback (created_by, request_id, message)
        VALUES ($1, $2, $3)
        ON CONFLICT (created_by, request_id) DO UPDATE SET message = user_feedback.message
        WHERE user_feedback.message = EXCLUDED.message
        RETURNING id, created_by, message, created_at`, input.CreatedBy, input.RequestID, input.Message).Scan(
		&result.ID, &result.CreatedBy, &result.Message, &result.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrConflict
	}
	if err != nil {
		return nil, fmt.Errorf("create feedback: %w", err)
	}
	return result, nil
}
