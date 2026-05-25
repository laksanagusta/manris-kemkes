package planning

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type fakePlanningHierarchyRepo struct {
	roOptions []entity.PlanningROOption
}

func (f fakePlanningHierarchyRepo) ListROOptions(context.Context, repository.PlanningROOptionFilter) ([]entity.PlanningROOption, error) {
	return f.roOptions, nil
}

func (f fakePlanningHierarchyRepo) ListObjectiveCompatibilityRows(context.Context, repository.PlanningCompatibilityFilter) ([]*entity.RiskObjective, int, error) {
	return nil, 0, nil
}

func TestListROOptionsUseCaseExecute(t *testing.T) {
	t.Parallel()

	repo := fakePlanningHierarchyRepo{
		roOptions: []entity.PlanningROOption{
			{
				ROID:           uuid.New(),
				ROTitle:        "RO A",
				KegiatanTitle:  "Kegiatan A",
				ProgramTitle:   "Program A",
				IKUTitle:       "IKU A",
				SasaranTitle:   "Sasaran A",
				TujuanTitle:    "Tujuan A",
				PlanningPeriod: "2027",
			},
		},
	}

	uc := NewListROOptionsUseCase(repo)
	result, err := uc.Execute(context.Background(), ListROOptionsInput{Period: "2027"})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if len(result.Data) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result.Data))
	}
	if result.Data[0].TujuanTitle != "Tujuan A" {
		t.Fatalf("expected tujuan title to survive, got %q", result.Data[0].TujuanTitle)
	}
}
