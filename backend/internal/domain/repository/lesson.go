package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// LessonRepository defines the interface for lesson data access
type LessonRepository interface {
	Create(ctx context.Context, lesson *entity.Lesson) error
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Lesson, error)
	Update(ctx context.Context, lesson *entity.Lesson) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Lesson, error)
	GetDashboard(ctx context.Context, orgIDs []uuid.UUID) (map[string]interface{}, error)
}
