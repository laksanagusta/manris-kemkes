package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskCascadeListFilter struct {
	OrgIDs      []uuid.UUID
	Status      string
	CascadeType string
	Query       string
	Page        int
	Limit       int
}

type RiskCascadeRepository interface {
	Create(ctx context.Context, cascade *entity.RiskCascade) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCascade, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Update(ctx context.Context, cascade *entity.RiskCascade) error
	List(ctx context.Context, filter RiskCascadeListFilter) ([]*entity.RiskCascade, int, error)
}
