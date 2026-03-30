package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// ControlRepository defines the interface for control data access
type ControlRepository interface {
	Create(ctx context.Context, control *entity.Control) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Control, error)
	Update(ctx context.Context, control *entity.Control) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, orgID *uuid.UUID) ([]*entity.Control, error)
	GetDashboard(ctx context.Context, orgID *uuid.UUID) (map[string]interface{}, error)
}
