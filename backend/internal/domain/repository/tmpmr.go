package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type TMPMRListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Page           int
	Limit          int
}

type TMPMRRepository interface {
	Create(ctx context.Context, assessment *entity.TMPMRAssessment) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.TMPMRAssessment, error)
	Update(ctx context.Context, assessment *entity.TMPMRAssessment) error
	List(ctx context.Context, filter TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error)
	ExistsByOrgPeriod(ctx context.Context, organizationID uuid.UUID, period string, excludeID *uuid.UUID) (bool, error)
}
