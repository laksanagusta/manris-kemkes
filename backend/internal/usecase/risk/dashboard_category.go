package risk

import (
	"context"
	"sort"

	"github.com/manris/backend/internal/domain/entity"
)

type dashboardCategoryRepo interface {
	DashboardCategoryCounts(ctx context.Context, cycle string) ([]*entity.DashboardCategoryCount, error)
}

type DashboardRiskCategoriesInput struct {
	Cycle string
}

type DashboardRiskCategoriesOutput struct {
	Counts []*entity.DashboardCategoryCount
}

type DashboardRiskCategoriesUseCase struct {
	repo dashboardCategoryRepo
}

func NewDashboardRiskCategoriesUseCase(repo dashboardCategoryRepo) *DashboardRiskCategoriesUseCase {
	return &DashboardRiskCategoriesUseCase{repo: repo}
}

func (uc *DashboardRiskCategoriesUseCase) Execute(ctx context.Context, input DashboardRiskCategoriesInput) (*DashboardRiskCategoriesOutput, error) {
	counts, err := uc.repo.DashboardCategoryCounts(ctx, input.Cycle)
	if err != nil {
		return nil, err
	}

	for _, c := range counts {
		if c.Category == "" {
			c.Category = "uncategorized"
		}
	}

	sort.Slice(counts, func(i, j int) bool {
		if counts[i].Count != counts[j].Count {
			return counts[i].Count > counts[j].Count
		}
		return counts[i].Category < counts[j].Category
	})

	return &DashboardRiskCategoriesOutput{Counts: counts}, nil
}
