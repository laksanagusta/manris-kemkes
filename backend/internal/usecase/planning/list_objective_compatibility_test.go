package planning

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type fakePlanningHierarchyRepoCompat struct{}

func (f fakePlanningHierarchyRepoCompat) ListROOptions(context.Context, repository.PlanningROOptionFilter) ([]entity.PlanningROOption, error) {
	return nil, nil
}

func (f fakePlanningHierarchyRepoCompat) ListObjectiveCompatibilityRows(context.Context, repository.PlanningCompatibilityFilter) ([]*entity.RiskObjective, int, error) {
	return []*entity.RiskObjective{
		{
			ID:                    uuid.New(),
			OrganizationID:        uuid.New(),
			Period:                "2027",
			Tujuan:                "Tujuan A",
			Sasaran:               "Sasaran A",
			IndikatorKinerjaUtama: "IKU A",
			Program:               "Program A",
			Kegiatan:              "Kegiatan A",
			ProcessBusiness:       "RO A",
		},
	}, 1, nil
}

func TestListObjectiveCompatibilityUseCaseExecute(t *testing.T) {
	t.Parallel()

	uc := NewListObjectiveCompatibilityUseCase(fakePlanningHierarchyRepoCompat{})
	result, err := uc.Execute(context.Background(), ListObjectiveCompatibilityInput{Period: "2027"})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if len(result.Data) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result.Data))
	}
	if result.Data[0].Program != "Program A" {
		t.Fatalf("expected flattened program title, got %q", result.Data[0].Program)
	}
}
