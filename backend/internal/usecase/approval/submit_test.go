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

func (r *fakeSubmitApprovalRepo) List(context.Context, string, string, *uuid.UUID) ([]*entity.ApprovalRequest, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) FindByID(context.Context, uuid.UUID) (*entity.ApprovalRequest, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitApprovalRepo) FindByEntity(context.Context, string, uuid.UUID) (*entity.ApprovalRequest, error) {
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
func (r *fakeSubmitApprovalRepo) GetPendingCount(context.Context, string, *uuid.UUID) (int, error) {
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
func (r *fakeSubmitRiskRepo) GetByID(context.Context, uuid.UUID) (*entity.Risk, error) {
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
func (r *fakeSubmitRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) DashboardSummary(context.Context) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) HeatmapData(context.Context) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) TopRisks(context.Context, int) ([]*entity.Risk, error) {
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
func (r *fakeSubmitRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, errors.New("not implemented")
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

var _ repo.UserRepository = (*fakeSubmitUserRepo)(nil)

type fakeSubmitIncidentRepo struct{}

func (r *fakeSubmitIncidentRepo) Create(context.Context, *entity.Incident) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitIncidentRepo) GetByID(context.Context, string) (*entity.Incident, error) {
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
func (r *fakeSubmitIncidentRepo) GetSummary(context.Context, string) (map[string]interface{}, error) {
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
