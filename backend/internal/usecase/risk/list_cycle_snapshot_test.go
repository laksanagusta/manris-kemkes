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
func (r *fakeCycleSnapshotRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return nil, domainerrors.ErrRiskNotFound
}
func (r *fakeCycleSnapshotRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *fakeCycleSnapshotRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *fakeCycleSnapshotRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (r *fakeCycleSnapshotRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *fakeCycleSnapshotRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
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
func (r *fakeCycleSnapshotRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (r *fakeCycleSnapshotRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *fakeCycleSnapshotRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
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

	items, err := uc.Execute(context.Background(), ListRiskCycleSnapshotInput{Cycle: "2026-Q2"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.cycle != "2026-Q2" {
		t.Fatalf("expected cycle 2026-Q2, got %s", repo.cycle)
	}
	if len(items) != 1 || items[0].Title != "Risk A" {
		t.Fatalf("unexpected items: %#v", items)
	}
}
