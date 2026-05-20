package planning

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type ListObjectiveCompatibilityUseCase struct {
	repo repository.PlanningHierarchyRepository
}

func NewListObjectiveCompatibilityUseCase(repo repository.PlanningHierarchyRepository) *ListObjectiveCompatibilityUseCase {
	return &ListObjectiveCompatibilityUseCase{repo: repo}
}

type ListObjectiveCompatibilityInput struct {
	OrganizationID *uuid.UUID
	Period         string
	Query          string
	Page           int
	Limit          int
}

type ListObjectiveCompatibilityOutput struct {
	Data  []*entity.RiskObjective `json:"data"`
	Total int                     `json:"total"`
	Page  int                     `json:"page"`
	Limit int                     `json:"limit"`
}

func (uc *ListObjectiveCompatibilityUseCase) Execute(ctx context.Context, input ListObjectiveCompatibilityInput) (*ListObjectiveCompatibilityOutput, error) {
	items, total, err := uc.repo.ListObjectiveCompatibilityRows(ctx, repository.PlanningCompatibilityFilter{
		OrganizationID: input.OrganizationID,
		Period:         strings.TrimSpace(input.Period),
		Q:              strings.TrimSpace(input.Query),
		Page:           input.Page,
		Limit:          input.Limit,
	})
	if err != nil {
		return nil, err
	}

	page := input.Page
	if page < 1 {
		page = 1
	}
	limit := input.Limit
	if limit < 1 {
		limit = 10
	}

	return &ListObjectiveCompatibilityOutput{
		Data:  items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}
