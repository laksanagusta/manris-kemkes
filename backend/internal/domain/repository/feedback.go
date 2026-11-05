package repository

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

type FeedbackRepository interface {
	Create(context.Context, *entity.Feedback) (*entity.Feedback, error)
}
