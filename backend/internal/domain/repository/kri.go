package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// KRIRepository defines the interface for KRI data access
type KRIRepository interface {
	Create(ctx context.Context, kri *entity.KRI) error
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.KRI, error)
	Update(ctx context.Context, kri *entity.KRI) error
	Delete(ctx context.Context, id uuid.UUID) error
	Archive(ctx context.Context, id uuid.UUID, reason string) error
	List(ctx context.Context, orgIDs []uuid.UUID, includeArchived bool) ([]*entity.KRI, error)
	GetDashboard(ctx context.Context, orgIDs []uuid.UUID) (map[string]interface{}, error)
}
