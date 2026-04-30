package risk

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type categoryRiskRepo struct {
	created      *entity.Risk
	updated      *entity.Risk
	byID         *entity.Risk
	listOrgIDs   []uuid.UUID
	listStatus   string
	listCategory string
}

func (r *categoryRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	r.created = cloneRisk(risk)
	risk.ID = uuid.New()
	return nil
}

func (r *categoryRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if r.byID == nil {
		return nil, domainerrors.ErrRiskNotFound
	}
	return cloneRisk(r.byID), nil
}

func (r *categoryRiskRepo) Update(_ context.Context, risk *entity.Risk) error {
	r.updated = cloneRisk(risk)
	return nil
}

func (r *categoryRiskRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *categoryRiskRepo) List(_ context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error) {
	r.listOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	r.listStatus = status
	r.listCategory = category
	return []*entity.Risk{}, nil
}
func (r *categoryRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return []*entity.Risk{}, 0, nil
}
func (r *categoryRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *categoryRiskRepo) NextRiskCode(context.Context) (string, error) { return "R-001", nil }
func (r *categoryRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *categoryRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *categoryRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *categoryRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, errors.New("not implemented")
}
func (r *categoryRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *categoryRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *categoryRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *categoryRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *categoryRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (r *categoryRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *categoryRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *categoryRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *categoryRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *categoryRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *categoryRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *categoryRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

var _ repo.RiskRepository = (*categoryRiskRepo)(nil)

type categoryUserRepo struct{}

func (r *categoryUserRepo) Create(context.Context, *entity.User) error { return nil }
func (r *categoryUserRepo) GetByID(context.Context, uuid.UUID) (*entity.User, error) {
	return &entity.User{ID: uuid.New(), Name: "user"}, nil
}
func (r *categoryUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (r *categoryUserRepo) Update(context.Context, *entity.User) error   { return nil }
func (r *categoryUserRepo) Delete(context.Context, uuid.UUID) error      { return nil }
func (r *categoryUserRepo) List(context.Context) ([]*entity.User, error) { return nil, nil }
func (r *categoryUserRepo) ListWithFilter(context.Context, repo.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

type categoryOrgRepo struct{}

func (r *categoryOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *categoryOrgRepo) GetByID(context.Context, uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: uuid.New(), Name: "org"}, nil
}
func (r *categoryOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *categoryOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *categoryOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *categoryOrgRepo) ListWithFilter(context.Context, repo.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *categoryOrgRepo) GetDescendants(_ context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{id}, nil
}
func (r *categoryOrgRepo) GetContext(_ context.Context, _ uuid.UUID) (string, error) {
	return "", nil
}

func TestCreateRiskUseCase_ExecutePersistsCategory(t *testing.T) {
	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risk title",
		Category:          entity.RiskCategoryKebijakan,
		CreatedBy:         &createdBy,
		Probability:       3,
		Impact:            3,
		TargetProbability: 2,
		TargetImpact:      2,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.created == nil {
		t.Fatal("expected risk to be created")
	}
	if riskRepo.created.Category != entity.RiskCategoryKebijakan {
		t.Fatalf("expected category %q, got %q", entity.RiskCategoryKebijakan, riskRepo.created.Category)
	}
}

func TestCreateRiskUseCase_ExecuteRejectsInvalidCategory(t *testing.T) {
	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risk title",
		Category:          "unknown",
		CreatedBy:         &createdBy,
		Probability:       3,
		Impact:            3,
		TargetProbability: 2,
		TargetImpact:      2,
	})
	if !errors.Is(err, domainerrors.ErrInvalidRiskCategory) {
		t.Fatalf("expected invalid risk category error, got %v", err)
	}
}

func TestUpdateRiskUseCase_ExecutePersistsCategory(t *testing.T) {
	riskID := uuid.New()
	riskRepo := &categoryRiskRepo{byID: &entity.Risk{
		ID:             riskID,
		Code:           "R-001",
		Title:          "Old title",
		Category:       entity.RiskCategoryKebijakan,
		Status:         entity.RiskStatusDraft,
		VersionGroupID: uuid.New(),
		OrganizationID: uuidPtr(uuid.New()),
		Probability:    3,
		Impact:         3,
	}}

	uc := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, nil, nil)
	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Updated title",
		Description:    "Updated desc",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusDraft,
		OrganizationID: riskRepo.byID.OrganizationID,
		Probability:    3,
		Impact:         3,
	}, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.updated == nil {
		t.Fatal("expected risk to be updated")
	}
	if riskRepo.updated.Category != entity.RiskCategoryOperasional {
		t.Fatalf("expected category %q, got %q", entity.RiskCategoryOperasional, riskRepo.updated.Category)
	}
}

func TestUpdateRiskUseCase_ExecuteRejectsInvalidCategory(t *testing.T) {
	riskID := uuid.New()
	riskRepo := &categoryRiskRepo{byID: &entity.Risk{
		ID:             riskID,
		Code:           "R-001",
		Title:          "Old title",
		Category:       entity.RiskCategoryKebijakan,
		Status:         entity.RiskStatusDraft,
		VersionGroupID: uuid.New(),
		OrganizationID: uuidPtr(uuid.New()),
		Probability:    3,
		Impact:         3,
	}}

	uc := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, nil, nil)
	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Updated title",
		Description:    "Updated desc",
		Category:       "invalid",
		Status:         entity.RiskStatusDraft,
		OrganizationID: riskRepo.byID.OrganizationID,
		Probability:    3,
		Impact:         3,
	}, nil)
	if !errors.Is(err, domainerrors.ErrInvalidRiskCategory) {
		t.Fatalf("expected invalid risk category error, got %v", err)
	}
}

func TestListRisksUseCase_ExecutePassesCategoryFilter(t *testing.T) {
	riskRepo := &categoryRiskRepo{}
	orgSvc := service.NewOrganizationHierarchy(&categoryOrgRepo{})
	uc := NewListRisksUseCase(riskRepo, orgSvc)
	orgID := uuid.New()

	_, err := uc.Execute(context.Background(), ListRisksInput{
		OrgIDs:   []uuid.UUID{orgID},
		Status:   "approved",
		Category: entity.RiskCategoryKepatuhan,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.listCategory != entity.RiskCategoryKepatuhan {
		t.Fatalf("expected category filter %q, got %q", entity.RiskCategoryKepatuhan, riskRepo.listCategory)
	}
	if riskRepo.listStatus != "approved" {
		t.Fatalf("expected status approved, got %q", riskRepo.listStatus)
	}
}

// lockAwareWorkingPaperRepo is a minimal mock that satisfies WorkingPaperLockChecker.
type lockAwareWorkingPaperRepo struct {
	blocked bool
}

func (r *lockAwareWorkingPaperRepo) HasBlockingDocumentLink(_ context.Context, _ uuid.UUID) (bool, error) {
	return r.blocked, nil
}

func TestUpdateRiskUseCase_ExecuteRejectsRiskLinkedToSigningWorkingPaper(t *testing.T) {
	riskID := uuid.New()
	riskRepo := &categoryRiskRepo{byID: &entity.Risk{
		ID:             riskID,
		Code:           "R-001",
		Title:          "Old title",
		Category:       entity.RiskCategoryKebijakan,
		Status:         entity.RiskStatusDraft,
		VersionGroupID: uuid.New(),
		OrganizationID: uuidPtr(uuid.New()),
		Probability:    3,
		Impact:         3,
	}}

	wpRepo := &lockAwareWorkingPaperRepo{blocked: true}
	uc := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, wpRepo, nil)

	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Updated title",
		Description:    "Updated desc",
		Category:       entity.RiskCategoryKebijakan,
		Status:         entity.RiskStatusDraft,
		OrganizationID: riskRepo.byID.OrganizationID,
		Probability:    3,
		Impact:         3,
	}, nil)
	if err == nil {
		t.Fatal("expected error when risk is linked to signing working paper, got nil")
	}
	if !errors.Is(err, domainerrors.ErrInvalidStatus) {
		t.Fatalf("expected ErrInvalidStatus, got %v", err)
	}
}

func cloneRisk(risk *entity.Risk) *entity.Risk {
	if risk == nil {
		return nil
	}
	copy := *risk
	copy.Cause = append([]string(nil), risk.Cause...)
	copy.ImpactDesc = append([]string(nil), risk.ImpactDesc...)
	copy.Mitigations = append([]entity.Mitigation(nil), risk.Mitigations...)
	return &copy
}

func uuidPtr(id uuid.UUID) *uuid.UUID {
	return &id
}
