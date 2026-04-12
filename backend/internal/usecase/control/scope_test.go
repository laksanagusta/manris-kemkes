package control

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type scopeControlRepo struct {
	item *entity.Control
}

func (r *scopeControlRepo) Create(_ context.Context, _ *entity.Control) error { return nil }
func (r *scopeControlRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Control, error) {
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
func (r *scopeControlRepo) Update(_ context.Context, _ *entity.Control) error { return nil }
func (r *scopeControlRepo) Delete(_ context.Context, _ uuid.UUID) error       { return nil }
func (r *scopeControlRepo) List(_ context.Context, _ []uuid.UUID) ([]*entity.Control, error) {
	return nil, nil
}
func (r *scopeControlRepo) GetDashboard(_ context.Context, _ []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

var _ repository.ControlRepository = (*scopeControlRepo)(nil)

type scopeCtrlRiskRepo struct{}

func (r *scopeCtrlRiskRepo) Create(context.Context, *entity.Risk) error { return nil }
func (r *scopeCtrlRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return &entity.Risk{}, nil
}
func (r *scopeCtrlRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *scopeCtrlRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *scopeCtrlRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) ListRegister(context.Context, repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (r *scopeCtrlRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *scopeCtrlRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *scopeCtrlRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *scopeCtrlRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type scopeCtrlOrgRepo struct{}

func (r *scopeCtrlOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *scopeCtrlOrgRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: uuid.New(), Name: "org"}, nil
}
func (r *scopeCtrlOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *scopeCtrlOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *scopeCtrlOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *scopeCtrlOrgRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *scopeCtrlOrgRepo) GetDescendants(_ context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{id}, nil
}

func TestGetControlScopedAllowsAccessibleOrg(t *testing.T) {
	orgID := uuid.New()
	controlID := uuid.New()

	repo := &scopeControlRepo{item: &entity.Control{
		ID:             controlID,
		Code:           "C-001",
		Name:           "Test Control",
		Type:           "preventive",
		OrganizationID: &orgID,
	}}

	uc := NewGetControlUseCase(repo)
	result, err := uc.Execute(context.Background(), controlID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("expected access allowed, got %v", err)
	}
	if result.ID != controlID {
		t.Fatalf("expected control %s, got %s", controlID, result.ID)
	}
}

func TestGetControlScopedReturnsNotFoundForSiblingOrg(t *testing.T) {
	orgID := uuid.New()
	siblingOrg := uuid.New()
	controlID := uuid.New()

	repo := &scopeControlRepo{item: &entity.Control{
		ID:             controlID,
		Code:           "C-001",
		Name:           "Test Control",
		Type:           "preventive",
		OrganizationID: &orgID,
	}}

	uc := NewGetControlUseCase(repo)
	_, err := uc.Execute(context.Background(), controlID, []uuid.UUID{siblingOrg})
	if err == nil {
		t.Fatal("expected not-found error for sibling org, got nil")
	}
}

func TestUpdateControlParentCannotUpdateChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	controlID := uuid.New()

	repo := &scopeControlRepo{item: &entity.Control{
		ID:             controlID,
		Code:           "C-001",
		Name:           "Test Control",
		Type:           "preventive",
		OrganizationID: &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewUpdateControlUseCase(repo, &scopeCtrlRiskRepo{}, &scopeCtrlOrgRepo{})
	_, err := uc.Execute(context.Background(), UpdateControlInput{
		ID:             controlID,
		Code:           "C-001",
		Name:           "Updated",
		Type:           "preventive",
		OrganizationID: &childOrg,
	}, scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

type scopeAwareCtrlRiskRepo struct {
	scopeCtrlRiskRepo
	item *entity.Risk
}

func (r *scopeAwareCtrlRiskRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	if r.item == nil || r.item.ID != id {
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

func TestControlUpdateRejectsSiblingLinkedRisk(t *testing.T) {
	userOrg := uuid.New()
	siblingOrg := uuid.New()
	controlID := uuid.New()
	riskID := uuid.New()

	controlRepo := &scopeControlRepo{item: &entity.Control{
		ID:             controlID,
		Code:           "C-001",
		Name:           "Test Control",
		Type:           "preventive",
		OrganizationID: &userOrg,
	}}

	riskRepo := &scopeAwareCtrlRiskRepo{item: &entity.Risk{
		ID:             riskID,
		OrganizationID: &siblingOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &userOrg,
		AccessibleOrgIDs: []uuid.UUID{userOrg},
	}

	uc := NewUpdateControlUseCase(controlRepo, riskRepo, &scopeCtrlOrgRepo{})
	_, err := uc.Execute(context.Background(), UpdateControlInput{
		ID:             controlID,
		RiskID:         &riskID,
		Code:           "C-001",
		Name:           "Updated",
		Type:           "preventive",
		OrganizationID: &userOrg,
	}, scope.AccessibleOrgIDs, scope)
	if err == nil {
		t.Fatal("expected error for cross-org linked risk, got nil")
	}
	if !strings.Contains(err.Error(), "linked risk not found") {
		t.Fatalf("expected 'linked risk not found' error, got: %v", err)
	}
}

func TestDeleteControlParentCannotDeleteChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	controlID := uuid.New()

	repo := &scopeControlRepo{item: &entity.Control{
		ID:             controlID,
		Code:           "C-001",
		Name:           "Test Control",
		Type:           "preventive",
		OrganizationID: &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewDeleteControlUseCase(repo)
	_, err := uc.Execute(context.Background(), controlID, scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}
