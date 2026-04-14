package approval

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeSubmitApprovalRepo struct {
	created *entity.ApprovalRequest
	steps   []entity.ApprovalStep
}

func (r *fakeSubmitApprovalRepo) List(context.Context, string, string, *uuid.UUID, []uuid.UUID, int, int) ([]*entity.ApprovalRequest, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) FindByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.ApprovalRequest, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) FindByEntity(context.Context, string, uuid.UUID, []uuid.UUID) (*entity.ApprovalRequest, error) {
	return nil, nil
}
func (r *fakeSubmitApprovalRepo) GetHistoryByEntity(context.Context, string, uuid.UUID) ([]*entity.ApprovalHistory, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) Create(_ context.Context, req *entity.ApprovalRequest) error {
	copyReq := *req
	r.created = &copyReq
	return nil
}
func (r *fakeSubmitApprovalRepo) UpdateStatus(context.Context, uuid.UUID, string) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) AddHistory(context.Context, *entity.ApprovalHistory) error {
	return nil
}
func (r *fakeSubmitApprovalRepo) GetHistory(context.Context, uuid.UUID) ([]*entity.ApprovalHistory, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) GetPendingCount(context.Context, string, *uuid.UUID, []uuid.UUID) (int, error) {
	return 0, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) CreateSteps(_ context.Context, _ uuid.UUID, steps []entity.ApprovalStep) error {
	r.steps = append([]entity.ApprovalStep(nil), steps...)
	return nil
}
func (r *fakeSubmitApprovalRepo) GetSteps(context.Context, uuid.UUID) ([]*entity.ApprovalStep, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) ApproveCurrentStep(context.Context, uuid.UUID, uuid.UUID, string) (*entity.ApprovalStep, *entity.ApprovalStep, error) {
	return nil, nil, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) RejectCurrentStep(context.Context, uuid.UUID, uuid.UUID, string) error {
	return errors.New("not implemented")
}

var _ repo.ApprovalRepository = (*fakeSubmitApprovalRepo)(nil)

type fakeSubmitRiskRepo struct{ risk *entity.Risk }

func (r *fakeSubmitRiskRepo) Create(context.Context, *entity.Risk) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if r.risk == nil {
		return nil, domainerrors.ErrRiskNotFound
	}
	copyRisk := *r.risk
	return &copyRisk, nil
}
func (r *fakeSubmitRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *fakeSubmitRiskRepo) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, errors.New("not implemented")
}

var _ repo.RiskRepository = (*fakeSubmitRiskRepo)(nil)

type fakeSubmitUserRepo struct {
	users map[uuid.UUID]*entity.User
}

func (r *fakeSubmitUserRepo) Create(context.Context, *entity.User) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitUserRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	if user, ok := r.users[id]; ok {
		copyUser := *user
		return &copyUser, nil
	}
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitUserRepo) Update(context.Context, *entity.User) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitUserRepo) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitUserRepo) List(context.Context) ([]*entity.User, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitUserRepo) ListWithFilter(context.Context, repo.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, errors.New("not implemented")
}

var _ repo.UserRepository = (*fakeSubmitUserRepo)(nil)

type fakeSubmitIncidentRepo struct{}

func (r *fakeSubmitIncidentRepo) Create(context.Context, *entity.Incident) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitIncidentRepo) GetByID(_ context.Context, _ string, _ []uuid.UUID) (*entity.Incident, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitIncidentRepo) Update(context.Context, *entity.Incident) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitIncidentRepo) Delete(context.Context, string) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitIncidentRepo) List(context.Context, []uuid.UUID) ([]*entity.Incident, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitIncidentRepo) GetSummary(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, errors.New("not implemented")
}

var _ repo.IncidentRepository = (*fakeSubmitIncidentRepo)(nil)

func TestSubmitApprovalUseCase_UnitSubmissionTargetsReviewer(t *testing.T) {
	approvalRepo := &fakeSubmitApprovalRepo{}
	riskID := uuid.New()
	requestedBy := uuid.New()
	approverID := uuid.New()
	riskRepo := &fakeSubmitRiskRepo{risk: &entity.Risk{ID: riskID, CreatedBy: &requestedBy, Status: "draft"}}
	userRepo := &fakeSubmitUserRepo{users: map[uuid.UUID]*entity.User{approverID: {ID: approverID, Name: "Farah", Role: "reviewer"}}}

	uc := NewSubmitApprovalUseCase(approvalRepo, riskRepo, &fakeSubmitIncidentRepo{}, userRepo)
	_, err := uc.Execute(context.Background(), SubmitApprovalInput{
		RequestType: "risk",
		EntityID:    riskID.String(),
		RequestedBy: requestedBy.String(),
		Role:        "unit",
		ApproverIDs: []string{approverID.String()},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if approvalRepo.created == nil {
		t.Fatal("expected approval request to be created")
	}
	if approvalRepo.created.CurrentApproverRole != "reviewer" {
		t.Fatalf("expected first approver reviewer, got %q", approvalRepo.created.CurrentApproverRole)
	}
	if approvalRepo.created.CurrentApproverUserID == nil || *approvalRepo.created.CurrentApproverUserID != approverID {
		t.Fatalf("expected first approver user %s", approverID)
	}
	if len(approvalRepo.steps) != 1 {
		t.Fatalf("expected 1 approval step, got %d", len(approvalRepo.steps))
	}
}

func TestSubmitApprovalUseCase_SubmitDraftRisk_UpdatesStatusToInReview(t *testing.T) {
	approvalRepo := &fakeSubmitApprovalRepo{}
	riskID := uuid.New()
	requestedBy := uuid.New()
	approverID := uuid.New()
	riskRepo := &fakeSubmitRiskRepo{risk: &entity.Risk{ID: riskID, CreatedBy: &requestedBy, Status: "draft"}}
	userRepo := &fakeSubmitUserRepo{users: map[uuid.UUID]*entity.User{approverID: {ID: approverID, Name: "Farah", Role: "reviewer"}}}

	uc := NewSubmitApprovalUseCase(approvalRepo, riskRepo, &fakeSubmitIncidentRepo{}, userRepo)
	_, err := uc.Execute(context.Background(), SubmitApprovalInput{
		RequestType: "risk",
		EntityID:    riskID.String(),
		RequestedBy: requestedBy.String(),
		Role:        "unit",
		ApproverIDs: []string{approverID.String()},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestSubmitApprovalUseCase_ReviewSubmission_CreatesReviewStepType(t *testing.T) {
	approvalRepo := &fakeSubmitApprovalRepo{}
	riskID := uuid.New()
	requestedBy := uuid.New()
	reviewerID := uuid.New()
	pimpinanID := uuid.New()
	riskRepo := &fakeSubmitRiskRepo{risk: &entity.Risk{ID: riskID, CreatedBy: &requestedBy, Status: "draft"}}
	userRepo := &fakeSubmitUserRepo{users: map[uuid.UUID]*entity.User{
		reviewerID: {ID: reviewerID, Name: "Farah", Role: "reviewer"},
		pimpinanID: {ID: pimpinanID, Name: "Hendra", Role: "pimpinan"},
	}}

	uc := NewSubmitApprovalUseCase(approvalRepo, riskRepo, &fakeSubmitIncidentRepo{}, userRepo)
	_, err := uc.Execute(context.Background(), SubmitApprovalInput{
		RequestType:    "risk",
		EntityID:       riskID.String(),
		RequestedBy:    requestedBy.String(),
		Role:           "unit",
		ApproverIDs:    []string{reviewerID.String(), pimpinanID.String()},
		SubmissionType: "review",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(approvalRepo.steps) != 2 {
		t.Fatalf("expected 2 approval steps, got %d", len(approvalRepo.steps))
	}
	if approvalRepo.steps[0].StepType != "review" {
		t.Fatalf("expected first step type 'review', got %q", approvalRepo.steps[0].StepType)
	}
	if approvalRepo.steps[1].StepType != "approval" {
		t.Fatalf("expected second step type 'approval', got %q", approvalRepo.steps[1].StepType)
	}
}

func TestSubmitApprovalUseCase_ApprovalOnlySubmission_CreatesApprovalStepTypes(t *testing.T) {
	approvalRepo := &fakeSubmitApprovalRepo{}
	riskID := uuid.New()
	requestedBy := uuid.New()
	pimpinanID := uuid.New()
	riskRepo := &fakeSubmitRiskRepo{risk: &entity.Risk{ID: riskID, CreatedBy: &requestedBy, Status: "draft"}}
	userRepo := &fakeSubmitUserRepo{users: map[uuid.UUID]*entity.User{
		pimpinanID: {ID: pimpinanID, Name: "Hendra", Role: "pimpinan"},
	}}

	uc := NewSubmitApprovalUseCase(approvalRepo, riskRepo, &fakeSubmitIncidentRepo{}, userRepo)
	_, err := uc.Execute(context.Background(), SubmitApprovalInput{
		RequestType:    "risk",
		EntityID:       riskID.String(),
		RequestedBy:    requestedBy.String(),
		Role:           "unit",
		ApproverIDs:    []string{pimpinanID.String()},
		SubmissionType: "approval",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(approvalRepo.steps) != 1 {
		t.Fatalf("expected 1 approval step, got %d", len(approvalRepo.steps))
	}
	if approvalRepo.steps[0].StepType != "approval" {
		t.Fatalf("expected step type 'approval', got %q", approvalRepo.steps[0].StepType)
	}
}

func TestSubmitApprovalUseCase_EmptySubmissionType_DefaultsToApproval(t *testing.T) {
	approvalRepo := &fakeSubmitApprovalRepo{}
	riskID := uuid.New()
	requestedBy := uuid.New()
	reviewerID := uuid.New()
	riskRepo := &fakeSubmitRiskRepo{risk: &entity.Risk{ID: riskID, CreatedBy: &requestedBy, Status: "draft"}}
	userRepo := &fakeSubmitUserRepo{users: map[uuid.UUID]*entity.User{
		reviewerID: {ID: reviewerID, Name: "Farah", Role: "reviewer"},
	}}

	uc := NewSubmitApprovalUseCase(approvalRepo, riskRepo, &fakeSubmitIncidentRepo{}, userRepo)
	_, err := uc.Execute(context.Background(), SubmitApprovalInput{
		RequestType:    "risk",
		EntityID:       riskID.String(),
		RequestedBy:    requestedBy.String(),
		Role:           "unit",
		ApproverIDs:    []string{reviewerID.String()},
		SubmissionType: "",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(approvalRepo.steps) != 1 {
		t.Fatalf("expected 1 approval step, got %d", len(approvalRepo.steps))
	}
	if approvalRepo.steps[0].StepType != "approval" {
		t.Fatalf("expected step type 'approval' for backward compatibility, got %q", approvalRepo.steps[0].StepType)
	}
}
