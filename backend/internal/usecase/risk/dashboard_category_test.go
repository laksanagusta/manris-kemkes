package risk

import (
	"context"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

type fakeDashboardCategoryRepo struct {
	dashboardCategoryCounts func(context.Context) ([]*entity.DashboardCategoryCount, error)
}

func (r *fakeDashboardCategoryRepo) DashboardCategoryCounts(ctx context.Context) ([]*entity.DashboardCategoryCount, error) {
	return r.dashboardCategoryCounts(ctx)
}

func TestGetDashboardRiskCategoriesUseCase_ExecuteReturnsSortedCounts(t *testing.T) {
	repo := &fakeDashboardCategoryRepo{
		dashboardCategoryCounts: func(_ context.Context) ([]*entity.DashboardCategoryCount, error) {
			return []*entity.DashboardCategoryCount{
				{Category: "operasional", Count: 3, Rendah: 1, Sedang: 1, Tinggi: 1, Ekstrem: 0},
				{Category: "strategis", Count: 5, Rendah: 0, Sedang: 2, Tinggi: 2, Ekstrem: 1},
				{Category: "kepatuhan", Count: 3, Rendah: 2, Sedang: 1, Tinggi: 0, Ekstrem: 0},
				{Category: "finansial", Count: 1, Rendah: 0, Sedang: 0, Tinggi: 0, Ekstrem: 1},
			}, nil
		},
	}

	uc := NewDashboardRiskCategoriesUseCase(repo)
	result, err := uc.Execute(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(result) != 4 {
		t.Fatalf("expected 4 results, got %d", len(result))
	}

	if result[0].Category != "strategis" || result[0].Count != 5 {
		t.Fatalf("expected strategis with count 5 first, got %#v", result[0])
	}
	if result[0].Rendah != 0 || result[0].Sedang != 2 || result[0].Tinggi != 2 || result[0].Ekstrem != 1 {
		t.Fatalf("expected strategis severity breakdown {0,2,2,1}, got rendah=%d sedang=%d tinggi=%d ekstrem=%d",
			result[0].Rendah, result[0].Sedang, result[0].Tinggi, result[0].Ekstrem)
	}
	if result[1].Category != "kepatuhan" || result[1].Count != 3 {
		t.Fatalf("expected kepatuhan with count 3 second, got %#v", result[1])
	}
	if result[2].Category != "operasional" || result[2].Count != 3 {
		t.Fatalf("expected operasional with count 3 third, got %#v", result[2])
	}
	if result[3].Category != "finansial" || result[3].Count != 1 {
		t.Fatalf("expected finansial with count 1 last, got %#v", result[3])
	}
	if result[3].Ekstrem != 1 {
		t.Fatalf("expected finansial to have 1 ekstrem, got %d", result[3].Ekstrem)
	}
}

func TestGetDashboardRiskCategoriesUseCase_ExecuteMapsLegacyBlankToUncategorized(t *testing.T) {
	repo := &fakeDashboardCategoryRepo{
		dashboardCategoryCounts: func(_ context.Context) ([]*entity.DashboardCategoryCount, error) {
			return []*entity.DashboardCategoryCount{
				{Category: "", Count: 2, Rendah: 1, Sedang: 1, Tinggi: 0, Ekstrem: 0},
				{Category: "strategis", Count: 4, Rendah: 0, Sedang: 1, Tinggi: 2, Ekstrem: 1},
			}, nil
		},
	}

	uc := NewDashboardRiskCategoriesUseCase(repo)
	result, err := uc.Execute(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(result) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result))
	}

	if result[0].Category != "strategis" || result[0].Count != 4 {
		t.Fatalf("expected strategis first, got %#v", result[0])
	}
	if result[1].Category != "uncategorized" || result[1].Count != 2 {
		t.Fatalf("expected uncategorized (mapped from blank) second, got %#v", result[1])
	}
}
