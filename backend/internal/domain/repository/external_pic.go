package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type ExternalPICRepository interface {
	Create(ctx context.Context, pic *entity.ExternalPIC) error
	GetOrCreateByName(ctx context.Context, name string) (*entity.ExternalPIC, error)
	List(ctx context.Context) ([]*entity.ExternalPIC, error)
	GetByID(ctx context.Context, id uuid.UUID) (*entity.ExternalPIC, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
