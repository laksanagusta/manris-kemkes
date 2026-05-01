package riskobjective

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type ListRiskObjectivesUseCase struct {
	repo repository.RiskObjectiveRepository
}

func NewListRiskObjectivesUseCase(repo repository.RiskObjectiveRepository) *ListRiskObjectivesUseCase {
	return &ListRiskObjectivesUseCase{repo: repo}
}

type ListRiskObjectivesInput struct {
	OrganizationID *uuid.UUID
	Period         string
	Q              string
	Page           int
	Limit          int
}

type ListRiskObjectivesOutput struct {
	Data   []*entity.RiskObjective `json:"data"`
	Total  int                      `json:"total"`
	Page   int                      `json:"page"`
	Limit  int                      `json:"limit"`
}

func (uc *ListRiskObjectivesUseCase) Execute(ctx context.Context, input ListRiskObjectivesInput) (*ListRiskObjectivesOutput, error) {
	items, total, err := uc.repo.List(ctx, repository.RiskObjectiveListFilter{
		OrganizationID: input.OrganizationID,
		Period:         input.Period,
		Q:              input.Q,
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

	return &ListRiskObjectivesOutput{
		Data:  items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}