package risk

import (
	"context"
	"sort"

	"github.com/manris/backend/internal/domain/entity"
)

type dashboardCategoryRepo interface {
	DashboardCategoryCounts(ctx context.Context) ([]*entity.DashboardCategoryCount, error)
}

type DashboardRiskCategoriesUseCase struct {
	repo dashboardCategoryRepo
}

func NewDashboardRiskCategoriesUseCase(repo dashboardCategoryRepo) *DashboardRiskCategoriesUseCase {
	return &DashboardRiskCategoriesUseCase{repo: repo}
}

func (uc *DashboardRiskCategoriesUseCase) Execute(ctx context.Context) ([]*entity.DashboardCategoryCount, error) {
	counts, err := uc.repo.DashboardCategoryCounts(ctx)
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

	return counts, nil
}
