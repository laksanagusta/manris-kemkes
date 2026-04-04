package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeCycleSnapshotRiskRepo struct {
	cycle string
	items []*entity.Risk
}

func (r *fakeCycleSnapshotRiskRepo) Create(context.Context, *entity.Risk) error { return nil }
func (r *fakeCycleSnapshotRiskRepo) GetByID(context.Context, uuid.UUID) (*entity.Risk, error) {
	return nil, domainerrors.ErrRiskNotFound
}
func (r *fakeCycleSnapshotRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *fakeCycleSnapshotRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *fakeCycleSnapshotRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *fakeCycleSnapshotRiskRepo) DashboardSummary(context.Context) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) HeatmapData(context.Context) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) TopRisks(context.Context, int) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) ListCycleSnapshot(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
	r.cycle = cycle
	return r.items, nil
}
func (r *fakeCycleSnapshotRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return nil
}
func (r *fakeCycleSnapshotRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) DashboardCategoryCounts(context.Context) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetHeatmapVelocity(context.Context, string, string) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetOverdueMitigationTimeline(context.Context) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetKRIBreachSummary(context.Context) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetUnitResponseTime(context.Context) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

var _ repo.RiskRepository = (*fakeCycleSnapshotRiskRepo)(nil)

func TestListCycleSnapshotUseCase_RejectsEmptyCycle(t *testing.T) {
	uc := NewListRiskCycleSnapshotUseCase(&fakeCycleSnapshotRiskRepo{}, nil)

	_, err := uc.Execute(context.Background(), ListRiskCycleSnapshotInput{})
	if err != domainerrors.ErrInvalidInput {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestListCycleSnapshotUseCase_ReturnsSnapshotForCycle(t *testing.T) {
	repo := &fakeCycleSnapshotRiskRepo{items: []*entity.Risk{{Title: "Risk A"}}}
	uc := NewListRiskCycleSnapshotUseCase(repo, nil)

	items, err := uc.Execute(context.Background(), ListRiskCycleSnapshotInput{Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.cycle != "2026-H1" {
		t.Fatalf("expected cycle 2026-H1, got %s", repo.cycle)
	}
	if len(items) != 1 || items[0].Title != "Risk A" {
		t.Fatalf("unexpected items: %#v", items)
	}
}
