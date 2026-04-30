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
	Data  []*entity.RiskObjective `json:"data"`
	Total int                     `json:"total"`
	Page  int                     `json:"page"`
	Limit int                     `json:"limit"`
}

func (uc *ListRiskObjectivesUseCase) Execute(ctx context.Context, input ListRiskObjectivesInput) (*ListRiskObjectivesOutput, error) {
	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 || input.Limit > 100 {
		input.Limit = 10
	}
	items, total, err := uc.repo.List(ctx, repository.RiskObjectiveListFilter{
		OrganizationID: input.OrganizationID,
		Period:         input.Period,
		Query:          input.Q,
		Page:           input.Page,
		Limit:          input.Limit,
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*entity.RiskObjective{}
	}
	return &ListRiskObjectivesOutput{Data: items, Total: total, Page: input.Page, Limit: input.Limit}, nil
}
