package impactcriteria

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// ListInput holds filter params for listing impact criteria.
type ListInput struct {
	Category    *string
	UPRLevel    *string
	ImpactLevel *int
}

// ListOutput holds the result.
type ListOutput struct {
	Criteria []*entity.ImpactCriteria
	Total    int
}

// ListUseCase handles listing impact criteria.
type ListUseCase interface {
	Execute(ctx context.Context, input ListInput) (ListOutput, error)
}

type listUseCase struct {
	repo repository.ImpactCriteriaRepository
}

// NewListUseCase creates a new list use case.
func NewListUseCase(repo repository.ImpactCriteriaRepository) ListUseCase {
	return &listUseCase{repo: repo}
}

func (uc *listUseCase) Execute(ctx context.Context, input ListInput) (ListOutput, error) {
	filter := repository.ImpactCriteriaFilter{
		Category:    input.Category,
		UPRLevel:    input.UPRLevel,
		ImpactLevel: input.ImpactLevel,
	}

	criteria, err := uc.repo.List(ctx, filter)
	if err != nil {
		return ListOutput{}, err
	}

	return ListOutput{Criteria: criteria, Total: len(criteria)}, nil
}