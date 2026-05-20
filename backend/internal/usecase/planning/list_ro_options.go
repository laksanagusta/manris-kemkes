package planning

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type ListROOptionsUseCase struct {
	repo repository.PlanningHierarchyRepository
}

func NewListROOptionsUseCase(repo repository.PlanningHierarchyRepository) *ListROOptionsUseCase {
	return &ListROOptionsUseCase{repo: repo}
}

type ListROOptionsInput struct {
	OrganizationID uuid.UUID
	Period         string
	Query          string
}

type ListROOptionsOutput struct {
	Data []*entity.PlanningROOption `json:"data"`
}

func (uc *ListROOptionsUseCase) Execute(ctx context.Context, input ListROOptionsInput) (*ListROOptionsOutput, error) {
	items, err := uc.repo.ListROOptions(ctx, repository.PlanningROOptionFilter{
		OrganizationID: input.OrganizationID,
		Period:         strings.TrimSpace(input.Period),
		Q:              strings.TrimSpace(input.Query),
		Page:           1,
		Limit:          100,
	})
	if err != nil {
		return nil, err
	}

	out := make([]*entity.PlanningROOption, 0, len(items))
	for i := range items {
		item := items[i]
		out = append(out, &item)
	}

	return &ListROOptionsOutput{Data: out}, nil
}
