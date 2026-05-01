package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// ImpactCriteriaFilter holds optional filter params for listing impact criteria.
type ImpactCriteriaFilter struct {
	Category   *string
	UPRLevel   *string
	ImpactLevel *int
}

// ImpactCriteriaRepository defines the interface for impact criteria data access.
type ImpactCriteriaRepository interface {
	List(ctx context.Context, filter ImpactCriteriaFilter) ([]*entity.ImpactCriteria, error)
	GetByID(ctx context.Context, id uuid.UUID) (*entity.ImpactCriteria, error)
}