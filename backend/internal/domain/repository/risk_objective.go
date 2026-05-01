package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskObjectiveListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Status         string
	Q              string
	Page           int
	Limit          int
}

type RiskObjectiveRepository interface {
	Create(ctx context.Context, objective *entity.RiskObjective) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskObjective, error)
	Update(ctx context.Context, objective *entity.RiskObjective) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter RiskObjectiveListFilter) ([]*entity.RiskObjective, int, error)
}