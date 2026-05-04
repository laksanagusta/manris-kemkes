package riskcascade

import (
	"context"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeMitigationTaskRepo struct {
	created []*entity.MitigationTask
}

func (f *fakeMitigationTaskRepo) Create(_ context.Context, task *entity.MitigationTask) error {
	f.created = append(f.created, task)
	return nil
}
func (f *fakeMitigationTaskRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.MitigationTask, error) {
	return nil, nil
}
func (f *fakeMitigationTaskRepo) Update(context.Context, *entity.MitigationTask) error { return nil }
func (f *fakeMitigationTaskRepo) ListByRisk(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (f *fakeMitigationTaskRepo) ListByMitigation(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (f *fakeMitigationTaskRepo) ListByUser(context.Context, uuid.UUID, string, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (f *fakeMitigationTaskRepo) ListPendingOverdue(context.Context, time.Time) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (f *fakeMitigationTaskRepo) GetRecurringMitigations(context.Context) ([]*entity.Mitigation, error) {
	return nil, nil
}
func (f *fakeMitigationTaskRepo) ListAll(context.Context, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (f *fakeMitigationTaskRepo) ListAllPaginated(context.Context, []uuid.UUID, int, int) ([]*entity.MitigationTask, int, error) {
	return nil, 0, nil
}
func (f *fakeMitigationTaskRepo) TaskExistsForPeriod(context.Context, uuid.UUID, string, string) (bool, error) {
	return false, nil
}

type fakeRiskCascadeRepo struct {
	cascade *entity.RiskCascade
	updated *entity.RiskCascade
}

func (f *fakeRiskCascadeRepo) Create(_ context.Context, cascade *entity.RiskCascade) error {
	f.cascade = cascade
	return nil
}

func (f *fakeRiskCascadeRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.RiskCascade, error) {
	if f.cascade != nil && f.cascade.ID == id {
		return f.cascade, nil
	}
	if f.cascade != nil && f.cascade.ID == uuid.Nil {
		f.cascade.ID = id
		return f.cascade, nil
	}
	return nil, fiber.ErrNotFound
}

func (f *fakeRiskCascadeRepo) Update(_ context.Context, cascade *entity.RiskCascade) error {
	f.updated = cascade
	f.cascade = cascade
	return nil
}

func (f *fakeRiskCascadeRepo) Delete(_ context.Context, id uuid.UUID) error {
	if f.cascade != nil && f.cascade.ID == id {
		f.cascade = nil
		return nil
	}
	return fiber.ErrNotFound
}

func (f *fakeRiskCascadeRepo) List(_ context.Context, _ repository.RiskCascadeListFilter) ([]*entity.RiskCascade, int, error) {
	if f.cascade == nil {
		return []*entity.RiskCascade{}, 0, nil
	}
	return []*entity.RiskCascade{f.cascade}, 1, nil
}

type fakeRiskRepo struct {
	risk   *entity.Risk
	source *entity.Risk
}

func (f *fakeRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	if risk.ID == uuid.Nil {
		risk.ID = uuid.New()
	}
	risk.CreatedAt = time.Now()
	risk.UpdatedAt = risk.CreatedAt
	for i := range risk.Mitigations {
		if risk.Mitigations[i].ID == uuid.Nil {
			risk.Mitigations[i].ID = uuid.New()
		}
		risk.Mitigations[i].RiskID = risk.ID
		risk.Mitigations[i].CreatedAt = risk.CreatedAt
	}
	f.risk = risk
	return nil
}

func (f *fakeRiskRepo) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if f.source != nil && f.source.ID == id {
		return f.source, nil
	}
	if f.risk != nil && f.risk.ID == id {
		return f.risk, nil
	}
	return &entity.Risk{
		ID:             id,
		Code:           "R-001",
		Title:          "Risiko sumber",
		Description:    "Deskripsi",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
		IsCycleCurrent: true,
		VersionNumber:  1,
		OrganizationID: func() *uuid.UUID { v := uuid.New(); return &v }(),
		Probability:    3,
		Impact:         3,
		Weight:         1,
	}, nil
}

func (f *fakeRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (f *fakeRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (f *fakeRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (f *fakeRiskRepo) ListRegister(context.Context, repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (f *fakeRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (f *fakeRiskRepo) NextRiskCode(context.Context) (string, error) { return "R-999", nil }
func (f *fakeRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (f *fakeRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (f *fakeRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (f *fakeRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (f *fakeRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (f *fakeRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (f *fakeRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (f *fakeRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (f *fakeRiskRepo) ActivateApprovedVersion(_ context.Context, approvedRiskID uuid.UUID) error {
	if f.risk != nil && f.risk.ID == approvedRiskID {
		f.risk.IsCurrent = true
		f.risk.IsCycleCurrent = true
		f.risk.Status = entity.RiskStatusApproved
		now := time.Now().UTC()
		f.risk.ReviewApprovedAt = &now
	}
	if f.source != nil {
		f.source.IsCurrent = false
		f.source.IsCycleCurrent = false
	}
	return nil
}
func (f *fakeRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (f *fakeRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (f *fakeRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (f *fakeRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (f *fakeRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (f *fakeRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (f *fakeRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type fakeOrgRepo struct{}

func (fakeOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (fakeOrgRepo) GetByID(context.Context, uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: uuid.New(), Name: "Org"}, nil
}
func (fakeOrgRepo) Update(context.Context, *entity.Organization) error   { return nil }
func (fakeOrgRepo) Delete(context.Context, uuid.UUID) error              { return nil }
func (fakeOrgRepo) List(context.Context) ([]*entity.Organization, error) { return nil, nil }
func (fakeOrgRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (fakeOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) { return "", nil }
func (fakeOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}

type fakeUserRepo struct {
	users map[uuid.UUID]*entity.User
}

func (f *fakeUserRepo) Create(context.Context, *entity.User) error { return nil }
func (f *fakeUserRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	if f == nil {
		return nil, fiber.ErrNotFound
	}
	if user, ok := f.users[id]; ok {
		return user, nil
	}
	return nil, fiber.ErrNotFound
}
func (f *fakeUserRepo) GetByUsername(context.Context, string) (*entity.User, error) { return nil, nil }
func (f *fakeUserRepo) GetByNIP(context.Context, string) (*entity.User, error)      { return nil, nil }
func (f *fakeUserRepo) Update(context.Context, *entity.User) error                  { return nil }
func (f *fakeUserRepo) Delete(context.Context, uuid.UUID) error                     { return nil }
func (f *fakeUserRepo) List(context.Context) ([]*entity.User, error)                { return nil, nil }
func (f *fakeUserRepo) ListWithFilter(context.Context, repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

func newFakeUserRepo(createdBy uuid.UUID) *fakeUserRepo {
	return &fakeUserRepo{
		users: map[uuid.UUID]*entity.User{
			createdBy: &entity.User{
				ID:   createdBy,
				Name: "Budi Mataram",
			},
		},
	}
}

func TestDecideUseCaseAcceptFullCreatesClone(t *testing.T) {
	sourceOrgID := uuid.New()
	targetOrgID := uuid.New()
	sourceRiskID := uuid.New()
	cascadeID := uuid.New()

	cascadeRepo := &fakeRiskCascadeRepo{
		cascade: &entity.RiskCascade{
			ID:           cascadeID,
			SourceRiskID: sourceRiskID,
			SourceOrgID:  sourceOrgID,
			TargetOrgID:  targetOrgID,
			CascadeType:  "mandatory_top_down",
			Status:       "proposed",
		},
	}
	riskRepo := &fakeRiskRepo{}
	orgRepo := &fakeOrgRepo{}
	taskRepo := &fakeMitigationTaskRepo{}
	createdBy := uuid.New()
	userRepo := newFakeUserRepo(createdBy)
	uc := NewDecideUseCase(cascadeRepo, riskRepo, orgRepo, userRepo, taskRepo)
	mitigationDue := "2026-06-10"
	riskRepo.source = &entity.Risk{
		ID:             sourceRiskID,
		Code:           "R-001",
		Title:          "Risiko sumber",
		Description:    "Deskripsi",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
		IsCycleCurrent: true,
		VersionNumber:  1,
		OrganizationID: &sourceOrgID,
		Probability:    3,
		Impact:         3,
		Weight:         1,
		Mitigations: []entity.Mitigation{
			{ID: uuid.New(), Action: "Mitigasi A", Owner: "PIC A", DueDate: &mitigationDue},
		},
	}
	out, err := uc.Execute(context.Background(), DecideInput{
		ID:           cascadeID,
		Decision:     "accept",
		AdoptionType: "full",
		DecisionNote: "setuju",
		CreatedBy:    createdBy,
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if out == nil || out.RiskID == nil {
		t.Fatal("expected created risk id")
	}
	if riskRepo.risk == nil || riskRepo.risk.Code != "R-001" {
		t.Fatalf("expected cloned risk to get a fresh code, got %#v", riskRepo.risk)
	}
	if riskRepo.risk == nil || riskRepo.risk.VersionNumber != 2 {
		t.Fatalf("expected cloned risk version 2, got %#v", riskRepo.risk)
	}
	if cascadeRepo.updated == nil || cascadeRepo.updated.Status != "implemented" {
		t.Fatalf("expected implemented cascade, got %#v", cascadeRepo.updated)
	}
	if riskRepo.risk == nil || riskRepo.risk.PreviousRiskID == nil || *riskRepo.risk.PreviousRiskID != sourceRiskID {
		t.Fatalf("expected cloned risk with previous id %v, got %#v", sourceRiskID, riskRepo.risk)
	}
	if riskRepo.risk.Status != entity.RiskStatusApproved {
		t.Fatalf("expected cloned risk status approved, got %q", riskRepo.risk.Status)
	}
	if !riskRepo.risk.IsCurrent || !riskRepo.risk.IsCycleCurrent {
		t.Fatalf("expected cloned risk to be current, got current=%v cycleCurrent=%v", riskRepo.risk.IsCurrent, riskRepo.risk.IsCycleCurrent)
	}
	if riskRepo.risk.ReviewApprovedAt == nil {
		t.Fatal("expected review approved at to be set")
	}
	if len(taskRepo.created) == 0 {
		t.Fatal("expected mitigation tasks to be created")
	}
	if len(riskRepo.risk.Mitigations) == 0 || riskRepo.risk.Mitigations[0].OwnerUserID == nil || *riskRepo.risk.Mitigations[0].OwnerUserID != createdBy {
		t.Fatalf("expected mitigation owner user to follow approver, got %#v", riskRepo.risk.Mitigations)
	}
	if riskRepo.risk.Mitigations[0].Owner != "Budi Mataram" {
		t.Fatalf("expected mitigation owner name to follow approver, got %q", riskRepo.risk.Mitigations[0].Owner)
	}
}

func TestDecideUseCaseAcceptAllowsTargetOrgOnlyScope(t *testing.T) {
	sourceOrgID := uuid.New()
	targetOrgID := uuid.New()
	sourceRiskID := uuid.New()
	cascadeID := uuid.New()

	cascadeRepo := &fakeRiskCascadeRepo{
		cascade: &entity.RiskCascade{
			ID:           cascadeID,
			SourceRiskID: sourceRiskID,
			SourceOrgID:  sourceOrgID,
			TargetOrgID:  targetOrgID,
			CascadeType:  "mandatory_top_down",
			Status:       "proposed",
		},
	}
	riskRepo := &fakeRiskRepo{}
	orgRepo := &fakeOrgRepo{}
	taskRepo := &fakeMitigationTaskRepo{}
	createdBy := uuid.New()
	userRepo := newFakeUserRepo(createdBy)
	uc := NewDecideUseCase(cascadeRepo, riskRepo, orgRepo, userRepo, taskRepo)
	mitigationDue := "2026-06-10"
	riskRepo.source = &entity.Risk{
		ID:             sourceRiskID,
		Code:           "R-001",
		Title:          "Risiko sumber",
		Description:    "Deskripsi",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
		IsCycleCurrent: true,
		VersionNumber:  1,
		OrganizationID: &sourceOrgID,
		Probability:    3,
		Impact:         3,
		Weight:         1,
		Mitigations: []entity.Mitigation{
			{ID: uuid.New(), Action: "Mitigasi A", Owner: "PIC A", DueDate: &mitigationDue},
		},
	}
	out, err := uc.Execute(context.Background(), DecideInput{
		ID:           cascadeID,
		Decision:     "accept",
		AdoptionType: "partial",
		DecisionNote: "setuju",
		CreatedBy:    createdBy,
		OrgIDs:       []uuid.UUID{targetOrgID},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if out == nil || out.RiskID == nil {
		t.Fatal("expected created risk id")
	}
	if riskRepo.risk == nil || riskRepo.risk.Code != "R-001" {
		t.Fatalf("expected cloned risk to get a fresh code, got %#v", riskRepo.risk)
	}
	if riskRepo.risk == nil || riskRepo.risk.VersionNumber != 2 {
		t.Fatalf("expected cloned risk version 2, got %#v", riskRepo.risk)
	}
	if riskRepo.risk == nil || riskRepo.risk.OrganizationID == nil || *riskRepo.risk.OrganizationID != targetOrgID {
		t.Fatalf("expected cloned risk for target org %v, got %#v", targetOrgID, riskRepo.risk)
	}
	if riskRepo.risk.Status != entity.RiskStatusApproved {
		t.Fatalf("expected cloned risk status approved, got %q", riskRepo.risk.Status)
	}
	if !riskRepo.risk.IsCurrent || !riskRepo.risk.IsCycleCurrent {
		t.Fatalf("expected cloned risk to be current, got current=%v cycleCurrent=%v", riskRepo.risk.IsCurrent, riskRepo.risk.IsCycleCurrent)
	}
	if len(taskRepo.created) == 0 {
		t.Fatal("expected mitigation tasks to be created")
	}
	if len(riskRepo.risk.Mitigations) == 0 || riskRepo.risk.Mitigations[0].OwnerUserID == nil || *riskRepo.risk.Mitigations[0].OwnerUserID != createdBy {
		t.Fatalf("expected mitigation owner user to follow approver, got %#v", riskRepo.risk.Mitigations)
	}
	if riskRepo.risk.Mitigations[0].Owner != "Budi Mataram" {
		t.Fatalf("expected mitigation owner name to follow approver, got %q", riskRepo.risk.Mitigations[0].Owner)
	}
}
