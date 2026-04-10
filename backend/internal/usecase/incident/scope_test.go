package incident

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

type scopeIncidentRepo struct {
	item *entity.Incident
}

func (r *scopeIncidentRepo) Create(_ context.Context, _ *entity.Incident) error { return nil }
func (r *scopeIncidentRepo) GetByID(_ context.Context, id string, orgIDs []uuid.UUID) (*entity.Incident, error) {
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
func (r *scopeIncidentRepo) Update(_ context.Context, _ *entity.Incident) error { return nil }
func (r *scopeIncidentRepo) Delete(_ context.Context, _ string) error           { return nil }
func (r *scopeIncidentRepo) List(_ context.Context, _ []uuid.UUID) ([]*entity.Incident, error) {
	return nil, nil
}
func (r *scopeIncidentRepo) GetSummary(_ context.Context, _ []uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

type scopeRiskRepo struct{}

func (r *scopeRiskRepo) Create(context.Context, *entity.Risk) error { return nil }
func (r *scopeRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return &entity.Risk{}, nil
}
func (r *scopeRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *scopeRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *scopeRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *scopeRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *scopeRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *scopeRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *scopeRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *scopeRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *scopeRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *scopeRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, nil
}
func (r *scopeRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *scopeRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *scopeRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *scopeRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *scopeRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *scopeRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

func TestGetIncidentScopedAllowsAccessibleOrg(t *testing.T) {
	orgID := uuid.New()
	incidentID := uuid.New()

	repo := &scopeIncidentRepo{item: &entity.Incident{
		ID:             incidentID,
		Title:          "Test",
		OrganizationID: &orgID,
	}}

	uc := NewGetIncidentUseCase(repo)
	result, err := uc.Execute(context.Background(), incidentID.String(), []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("expected access allowed, got %v", err)
	}
	if result.ID != incidentID {
		t.Fatalf("expected incident %s, got %s", incidentID, result.ID)
	}
}

func TestGetIncidentScopedReturnsNotFoundForSiblingOrg(t *testing.T) {
	orgID := uuid.New()
	siblingOrg := uuid.New()
	incidentID := uuid.New()

	repo := &scopeIncidentRepo{item: &entity.Incident{
		ID:             incidentID,
		Title:          "Test",
		OrganizationID: &orgID,
	}}

	uc := NewGetIncidentUseCase(repo)
	_, err := uc.Execute(context.Background(), incidentID.String(), []uuid.UUID{siblingOrg})
	if err == nil {
		t.Fatal("expected not-found error for sibling org, got nil")
	}
}

func TestUpdateIncidentParentCannotUpdateChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	incidentID := uuid.New()

	repo := &scopeIncidentRepo{item: &entity.Incident{
		ID:             incidentID,
		Title:          "Test",
		What:           "what",
		Who:            "who",
		Where:          "where",
		Severity:       "minor",
		Status:         "open",
		OrganizationID: &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewUpdateIncidentUseCase(repo, &scopeRiskRepo{})
	_, err := uc.Execute(context.Background(), UpdateIncidentInput{
		ID:             incidentID,
		Title:          "Updated",
		What:           "what",
		Who:            "who",
		Where:          "where",
		Severity:       "minor",
		Status:         "open",
		OrganizationID: &childOrg,
	}, scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

type scopeAwareRiskRepo struct {
	scopeRiskRepo
	item *entity.Risk
}

func (r *scopeAwareRiskRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
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

func TestIncidentUpdateRejectsSiblingLinkedRisk(t *testing.T) {
	userOrg := uuid.New()
	siblingOrg := uuid.New()
	incidentID := uuid.New()
	riskID := uuid.New()

	incidentRepo := &scopeIncidentRepo{item: &entity.Incident{
		ID:             incidentID,
		Title:          "Test",
		What:           "what",
		Who:            "who",
		Where:          "where",
		Severity:       "minor",
		Status:         "open",
		OrganizationID: &userOrg,
	}}

	riskRepo := &scopeAwareRiskRepo{item: &entity.Risk{
		ID:             riskID,
		OrganizationID: &siblingOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &userOrg,
		AccessibleOrgIDs: []uuid.UUID{userOrg},
	}

	uc := NewUpdateIncidentUseCase(incidentRepo, riskRepo)
	_, err := uc.Execute(context.Background(), UpdateIncidentInput{
		ID:             incidentID,
		Title:          "Updated",
		What:           "what",
		Who:            "who",
		Where:          "where",
		Severity:       "minor",
		Status:         "open",
		LinkedRiskIDs:  []string{riskID.String()},
		OrganizationID: &userOrg,
	}, scope.AccessibleOrgIDs, scope)
	if err == nil {
		t.Fatal("expected error for cross-org linked risk, got nil")
	}
	if !strings.Contains(err.Error(), "linked risk not found") {
		t.Fatalf("expected 'linked risk not found' error, got: %v", err)
	}
}

func TestDeleteIncidentParentCannotDeleteChildOwned(t *testing.T) {
	childOrg := uuid.New()
	parentOrg := uuid.New()
	incidentID := uuid.New()

	repo := &scopeIncidentRepo{item: &entity.Incident{
		ID:             incidentID,
		Title:          "Test",
		What:           "what",
		Who:            "who",
		Where:          "where",
		Severity:       "minor",
		Status:         "open",
		OrganizationID: &childOrg,
	}}

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	uc := NewDeleteIncidentUseCase(repo)
	_, err := uc.Execute(context.Background(), incidentID.String(), scope.AccessibleOrgIDs, scope)
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}
