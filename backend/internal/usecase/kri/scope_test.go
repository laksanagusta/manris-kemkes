package kri

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

type scopeKRIRepo struct {
	item *entity.KRI
}

func (r *scopeKRIRepo) Create(_ context.Context, _ *entity.KRI) error { return nil }
func (r *scopeKRIRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.KRI, error) {
	if r.item == nil {
		return nil, fmt.Errorf("not found")
	}
	if orgIDs != nil {
		found := false
		for _, oid := range orgIDs {
			if r.item.OrganizationID != nil && oid == *r.item.OrganizationID {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("not found")
		}
	}
	copy := *r.item
	return &copy, nil
}
func (r *scopeKRIRepo) Update(_ context.Context, _ *entity.KRI) error { return nil }
func (r *scopeKRIRepo) Delete(_ context.Context, _ uuid.UUID) error   { return nil }
func (r *scopeKRIRepo) Archive(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}
func (r *scopeKRIRepo) List(_ context.Context, _ []uuid.UUID, _ bool) ([]*entity.KRI, error) {
	return nil, nil
}
func (r *scopeKRIRepo) GetDashboard(_ context.Context, _ []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

type scopeKRIRiskRepo struct{}

func (r *scopeKRIRiskRepo) Create(context.Context, *entity.Risk) error { return nil }
func (r *scopeKRIRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return &entity.Risk{}, nil
}
func (r *scopeKRIRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *scopeKRIRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *scopeKRIRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *scopeKRIRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *scopeKRIRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *scopeKRIRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type scopeKRIOrgRepo struct{}

func (r *scopeKRIOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *scopeKRIOrgRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: uuid.New(), Name: "org"}, nil
}
func (r *scopeKRIOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *scopeKRIOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *scopeKRIOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *scopeKRIOrgRepo) GetDescendants(_ context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{id}, nil
}

func TestGetKRIScopedAllowsAccessibleOrg(t *testing.T) {
	orgID := uuid.New()
	kriID := uuid.New()

	repo := &scopeKRIRepo{item: &entity.KRI{
		ID:             kriID,
		Name:           "Test KRI",
		OrganizationID: &orgID,
	}}

	uc := NewGetKRIUseCase(repo)
	result, err := uc.Execute(context.Background(), kriID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("expected access allowed, got %v", err)
	}
	if result.ID != kriID {
		t.Fatalf("expected KRI %s, got %s", kriID, result.ID)
	}
}

func TestGetKRIScopedReturnsNotFoundForSiblingOrg(t *testing.T) {
	orgID := uuid.New()
	siblingOrg := uuid.New()
	kriID := uuid.New()

	repo := &scopeKRIRepo{item: &entity.KRI{
		ID:             kriID,
		Name:           "Test KRI",
		OrganizationID: &orgID,
	}}

	uc := NewGetKRIUseCase(repo)
	_, err := uc.Execute(context.Background(), kriID, []uuid.UUID{siblingOrg})
	if err == nil {
		t.Fatal("expected not-found error for sibling org, got nil")
	}
}

func TestUpdateKRIParentCannotUpdateChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	kriID := uuid.New()
	amberMax := 85.0

	repo := &scopeKRIRepo{item: &entity.KRI{
		ID:                kriID,
		Name:              "Test KRI",
		Metric:            "%",
		ThresholdMin:      0,
		ThresholdMax:      100,
		CurrentValue:      50,
		Direction:         "higher_worse",
		Frequency:         "monthly",
		AmberThresholdMax: &amberMax,
		OrganizationID:    &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewUpdateKRIUseCase(repo, &scopeKRIRiskRepo{}, &scopeKRIOrgRepo{})
	_, err := uc.Execute(context.Background(), UpdateKRIInput{
		ID:             kriID,
		RiskID:         uuid.New(),
		Name:           "Updated KRI",
		Description:    "desc",
		Metric:         "%",
		ThresholdMin:   0,
		ThresholdMax:   100,
		CurrentValue:   50,
		Direction:      "higher_worse",
		Frequency:      "monthly",
		OrganizationID: &childOrg,
	}, scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestDeleteKRIParentCannotDeleteChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	kriID := uuid.New()
	amberMax := 85.0

	repo := &scopeKRIRepo{item: &entity.KRI{
		ID:                kriID,
		Name:              "Test KRI",
		Metric:            "%",
		ThresholdMin:      0,
		ThresholdMax:      100,
		CurrentValue:      50,
		Direction:         "higher_worse",
		Frequency:         "monthly",
		AmberThresholdMax: &amberMax,
		OrganizationID:    &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewDeleteKRIUseCase(repo)
	_, err := uc.Execute(context.Background(), kriID, scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}
