package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type TMPMRListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Status         string
	Query          string
	SortBy         string
	SortOrder      string
	Page           int
	Limit          int
}

type TMPMRSummary struct {
	Total     int      `json:"total"`
	Draft     int      `json:"draft"`
	Submitted int      `json:"submitted"`
	Approved  int      `json:"approved"`
	Periods   []string `json:"periods"`
}

type TMPMRRepository interface {
	Summary(ctx context.Context, organizationID *uuid.UUID) (TMPMRSummary, error)
	Create(ctx context.Context, assessment *entity.TMPMRAssessment) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.TMPMRAssessment, error)
	Update(ctx context.Context, assessment *entity.TMPMRAssessment) error
	List(ctx context.Context, filter TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error)
	ExistsByOrgPeriod(ctx context.Context, organizationID uuid.UUID, period string, excludeID *uuid.UUID) (bool, error)
}
