package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type PlanningROOptionFilter struct {
	OrganizationID uuid.UUID
	PlanningID     *uuid.UUID
	Period         string
	Q              string
	Page           int
	Limit          int
}

type PlanningCompatibilityFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Q              string
	Page           int
	Limit          int
}

type PlanningHierarchyRepository interface {
	ListROOptions(ctx context.Context, filter PlanningROOptionFilter) ([]entity.PlanningROOption, error)
	ListObjectiveCompatibilityRows(ctx context.Context, filter PlanningCompatibilityFilter) ([]*entity.RiskObjective, int, error)
}
