package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakeDashboardCategoryRepo struct {
	dashboardCategoryCounts func(context.Context, string) ([]*entity.DashboardCategoryCount, error)
}

func (r *fakeDashboardCategoryRepo) DashboardCategoryCounts(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return r.dashboardCategoryCounts(ctx, cycle)
}

func TestGetDashboardRiskCategoriesUseCase_ExecuteReturnsSortedCounts(t *testing.T) {
	repo := &fakeDashboardCategoryRepo{
		dashboardCategoryCounts: func(_ context.Context, _ string) ([]*entity.DashboardCategoryCount, error) {
			return []*entity.DashboardCategoryCount{
				{Category: "operasional", Count: 3, Rendah: 1, Sedang: 1, Tinggi: 1, Ekstrem: 0},
				{Category: "strategis", Count: 5, Rendah: 0, Sedang: 2, Tinggi: 2, Ekstrem: 1},
				{Category: "kepatuhan", Count: 3, Rendah: 2, Sedang: 1, Tinggi: 0, Ekstrem: 0},
				{Category: "finansial", Count: 1, Rendah: 0, Sedang: 0, Tinggi: 0, Ekstrem: 1},
			}, nil
		},
	}

	uc := NewDashboardRiskCategoriesUseCase(repo)
	result, err := uc.Execute(context.Background(), DashboardRiskCategoriesInput{Cycle: ""})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(result.Counts) != 4 {
		t.Fatalf("expected 4 results, got %d", len(result.Counts))
	}

	if result.Counts[0].Category != "strategis" || result.Counts[0].Count != 5 {
		t.Fatalf("expected strategis with count 5 first, got %#v", result.Counts[0])
	}
	if result.Counts[0].Rendah != 0 || result.Counts[0].Sedang != 2 || result.Counts[0].Tinggi != 2 || result.Counts[0].Ekstrem != 1 {
		t.Fatalf("expected strategis severity breakdown {0,2,2,1}, got rendah=%d sedang=%d tinggi=%d ekstrem=%d",
			result.Counts[0].Rendah, result.Counts[0].Sedang, result.Counts[0].Tinggi, result.Counts[0].Ekstrem)
	}
	if result.Counts[1].Category != "kepatuhan" || result.Counts[1].Count != 3 {
		t.Fatalf("expected kepatuhan with count 3 second, got %#v", result.Counts[1])
	}
	if result.Counts[2].Category != "operasional" || result.Counts[2].Count != 3 {
		t.Fatalf("expected operasional with count 3 third, got %#v", result.Counts[2])
	}
	if result.Counts[3].Category != "finansial" || result.Counts[3].Count != 1 {
		t.Fatalf("expected finansial with count 1 last, got %#v", result.Counts[3])
	}
	if result.Counts[3].Ekstrem != 1 {
		t.Fatalf("expected finansial to have 1 ekstrem, got %d", result.Counts[3].Ekstrem)
	}
}

func TestGetDashboardRiskCategoriesUseCase_ExecuteMapsLegacyBlankToUncategorized(t *testing.T) {
	repo := &fakeDashboardCategoryRepo{
		dashboardCategoryCounts: func(_ context.Context, _ string) ([]*entity.DashboardCategoryCount, error) {
			return []*entity.DashboardCategoryCount{
				{Category: "", Count: 2, Rendah: 1, Sedang: 1, Tinggi: 0, Ekstrem: 0},
				{Category: "strategis", Count: 4, Rendah: 0, Sedang: 1, Tinggi: 2, Ekstrem: 1},
			}, nil
		},
	}

	uc := NewDashboardRiskCategoriesUseCase(repo)
	result, err := uc.Execute(context.Background(), DashboardRiskCategoriesInput{Cycle: ""})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(result.Counts) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result.Counts))
	}

	if result.Counts[0].Category != "strategis" || result.Counts[0].Count != 4 {
		t.Fatalf("expected strategis first, got %#v", result.Counts[0])
	}
	if result.Counts[1].Category != "uncategorized" || result.Counts[1].Count != 2 {
		t.Fatalf("expected uncategorized (mapped from blank) second, got %#v", result.Counts[1])
	}
}
