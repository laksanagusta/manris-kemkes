package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// KRIRepository defines the interface for KRI data access
type KRIRepository interface {
	Create(ctx context.Context, kri *entity.KRI) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.KRI, error)
	Update(ctx context.Context, kri *entity.KRI) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, orgID *uuid.UUID) ([]*entity.KRI, error)
	GetDashboard(ctx context.Context, orgID *uuid.UUID) (map[string]interface{}, error)
}
