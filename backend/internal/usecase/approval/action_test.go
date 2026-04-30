package approval

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeApprovalRepo struct {
	request       *entity.ApprovalRequest
	updatedStatus string
	histories     []*entity.ApprovalHistory
	currentStep   *entity.ApprovalStep
	nextStep      *entity.ApprovalStep
}

func (r *fakeApprovalRepo) List(context.Context, string, string, *uuid.UUID, []uuid.UUID, int, int) ([]*entity.ApprovalRequest, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeApprovalRepo) FindByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.ApprovalRequest, error) {
	if r.request == nil {
		return nil, domainerrors.ErrApprovalNotFound
	}
	return r.request, nil
}
func (r *fakeApprovalRepo) FindByEntity(context.Context, string, uuid.UUID, []uuid.UUID) (*entity.ApprovalRequest, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRepo) GetHistoryByEntity(context.Context, string, uuid.UUID) ([]*entity.ApprovalHistory, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRepo) Create(context.Context, *entity.ApprovalRequest) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalRepo) UpdateStatus(_ context.Context, _ uuid.UUID, status string) error {
	r.updatedStatus = status
	return nil
}
func (r *fakeApprovalRepo) AddHistory(_ context.Context, hist *entity.ApprovalHistory) error {
	r.histories = append(r.histories, hist)
	return nil
}
func (r *fakeApprovalRepo) GetHistory(context.Context, uuid.UUID) ([]*entity.ApprovalHistory, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRepo) GetPendingCount(context.Context, string, *uuid.UUID, []uuid.UUID) (int, error) {
	return 0, errors.New("not implemented")
}
func (r *fakeApprovalRepo) CreateSteps(context.Context, uuid.UUID, []entity.ApprovalStep) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalRepo) GetSteps(context.Context, uuid.UUID) ([]*entity.ApprovalStep, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRepo) ApproveCurrentStep(context.Context, uuid.UUID, uuid.UUID, string) (*entity.ApprovalStep, *entity.ApprovalStep, error) {
	if r.currentStep != nil {
		return r.currentStep, r.nextStep, nil
	}
	return &entity.ApprovalStep{StepType: "approval"}, nil, nil
}
func (r *fakeApprovalRepo) RejectCurrentStep(context.Context, uuid.UUID, uuid.UUID, string) error {
	return nil
}

var _ repo.ApprovalRepository = (*fakeApprovalRepo)(nil)

type fakeApprovalMitigationTaskRepo struct {
	created []*entity.MitigationTask
}

func (r *fakeApprovalMitigationTaskRepo) Create(_ context.Context, task *entity.MitigationTask) error {
	clone := *task
	r.created = append(r.created, &clone)
	return nil
}
func (r *fakeApprovalMitigationTaskRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) Update(context.Context, *entity.MitigationTask) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) ListByRisk(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) ListByMitigation(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) ListByUser(context.Context, uuid.UUID, string, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) ListPendingOverdue(context.Context, time.Time) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) GetRecurringMitigations(context.Context) ([]*entity.Mitigation, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) ListAll(context.Context, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) ListAllPaginated(context.Context, []uuid.UUID, int, int) ([]*entity.MitigationTask, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeApprovalMitigationTaskRepo) TaskExistsForPeriod(context.Context, uuid.UUID, string, string) (bool, error) {
	return false, nil
}

type fakeApprovalRiskRepo struct {
	risk              *entity.Risk
	activatedRiskID   uuid.UUID
	updatedRiskStatus string
	updateErr         error
}

func (r *fakeApprovalRiskRepo) Create(context.Context, *entity.Risk) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if r.risk == nil {
		return nil, domainerrors.ErrRiskNotFound
	}
	clone := *r.risk
	return &clone, nil
}
func (r *fakeApprovalRiskRepo) Update(_ context.Context, risk *entity.Risk) error {
	if r.updateErr != nil {
		return r.updateErr
	}
	r.updatedRiskStatus = risk.Status
	if r.risk != nil {
		r.risk.Status = risk.Status
		r.risk.Mitigations = append([]entity.Mitigation(nil), risk.Mitigations...)
	}
	return nil
}
func (r *fakeApprovalRiskRepo) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) ActivateApprovedVersion(_ context.Context, approvedRiskID uuid.UUID) error {
	r.activatedRiskID = approvedRiskID
	return nil
}
func (r *fakeApprovalRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, errors.New("not implemented")
}

var _ repo.RiskRepository = (*fakeApprovalRiskRepo)(nil)

type fakeApprovalIncidentRepo struct{}

func (r *fakeApprovalIncidentRepo) Create(context.Context, *entity.Incident) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalIncidentRepo) GetByID(_ context.Context, _ string, _ []uuid.UUID) (*entity.Incident, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalIncidentRepo) Update(context.Context, *entity.Incident) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalIncidentRepo) Delete(context.Context, string) error {
	return errors.New("not implemented")
}
func (r *fakeApprovalIncidentRepo) List(context.Context, []uuid.UUID) ([]*entity.Incident, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeApprovalIncidentRepo) GetSummary(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, errors.New("not implemented")
}

var _ repo.IncidentRepository = (*fakeApprovalIncidentRepo)(nil)

func TestApprovalActionUseCase_ApproveReassessmentActivatesNewCurrentVersion(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	previousRiskID := uuid.New()
	reviewerID := uuid.MustParse("10000000-0000-0000-0000-000000000004")
	approvalRepo := &fakeApprovalRepo{request: &entity.ApprovalRequest{
		ID:                    approvalID,
		RequestType:           "risk",
		EntityID:              riskID,
		CurrentStatus:         "pending",
		CurrentApproverRole:   "reviewer",
		CurrentApproverUserID: &reviewerID,
	}}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:             riskID,
		Status:         entity.RiskStatusInReview,
		PreviousRiskID: &previousRiskID,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    reviewerID.String(),
		ActorName:  "Testing User",
		ActorRole:  "reviewer",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.activatedRiskID != riskID {
		t.Fatalf("expected activated risk id %s, got %s", riskID, riskRepo.activatedRiskID)
	}
	if riskRepo.updatedRiskStatus != "" {
		t.Fatalf("expected no direct status update when activating reassessment, got %q", riskRepo.updatedRiskStatus)
	}
}

func TestApprovalActionUseCase_ReturnsErrorWhenRiskStatusUpdateFails(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	reviewerID := uuid.MustParse("10000000-0000-0000-0000-000000000004")
	approvalRepo := &fakeApprovalRepo{request: &entity.ApprovalRequest{
		ID:                    approvalID,
		RequestType:           "risk",
		EntityID:              riskID,
		CurrentStatus:         "pending",
		CurrentApproverRole:   "reviewer",
		CurrentApproverUserID: &reviewerID,
	}}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}, updateErr: errors.New("db write failed")}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    reviewerID.String(),
		ActorName:  "Testing User",
		ActorRole:  "reviewer",
	})
	if err == nil {
		t.Fatal("expected error when entity status update fails")
	}
	if approvalRepo.updatedStatus != "" {
		t.Fatalf("expected approval status to remain unchanged, got %q", approvalRepo.updatedStatus)
	}
	if len(approvalRepo.histories) != 0 {
		t.Fatalf("expected no approval history on failure, got %d", len(approvalRepo.histories))
	}
}

// Tests for new status flow: assessment_draft -> assessment_in_review -> approved

func TestApprovalActionUseCase_ReviewerApproves_NoLastStep_StatusUnchanged(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	reviewerID := uuid.MustParse("10000000-0000-0000-0000-000000000004")

	approvalRepo := &fakeApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                    approvalID,
			RequestType:           "risk",
			EntityID:              riskID,
			CurrentStatus:         "pending",
			CurrentApproverRole:   "reviewer",
			CurrentApproverUserID: &reviewerID,
		},
		currentStep: &entity.ApprovalStep{
			ID:             uuid.New(),
			StepType:       "review",
			ApproverUserID: reviewerID,
		},
	}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    reviewerID.String(),
		ActorName:  "Reviewer User",
		ActorRole:  "reviewer",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	// Reviewer is the last step here (no nextStep), so approval completes.
	// But reviewer step type is "review", not final approval — status stays assessment_in_review.
	if riskRepo.updatedRiskStatus != entity.RiskStatusInReview {
		t.Fatalf("expected risk status %q, got %q", entity.RiskStatusInReview, riskRepo.updatedRiskStatus)
	}
}

func TestApprovalActionUseCase_ReviewerApproves_WithNextApprovalStep_StatusUnchanged(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	reviewerID := uuid.MustParse("10000000-0000-0000-0000-000000000004")
	pimpinanID := uuid.MustParse("10000000-0000-0000-0000-000000000006")

	approvalRepo := &fakeApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                    approvalID,
			RequestType:           "risk",
			EntityID:              riskID,
			CurrentStatus:         "pending",
			CurrentApproverRole:   "reviewer",
			CurrentApproverUserID: &reviewerID,
		},
		currentStep: &entity.ApprovalStep{
			ID:             uuid.New(),
			StepType:       "review",
			ApproverUserID: reviewerID,
		},
		nextStep: &entity.ApprovalStep{
			ID:             uuid.New(),
			StepType:       "approval",
			ApproverUserID: pimpinanID,
		},
	}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    reviewerID.String(),
		ActorName:  "Reviewer User",
		ActorRole:  "reviewer",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.updatedRiskStatus != "" {
		t.Fatalf("expected no risk status update (stays assessment_in_review), got %q", riskRepo.updatedRiskStatus)
	}
	if approvalRepo.updatedStatus != "" {
		t.Fatalf("expected approval request to remain pending, got status update %q", approvalRepo.updatedStatus)
	}
}

func TestApprovalActionUseCase_PimpinanApproves_SetsStatusToApproved(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	pimpinanID := uuid.MustParse("10000000-0000-0000-0000-000000000005")

	approvalRepo := &fakeApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                    approvalID,
			RequestType:           "risk",
			EntityID:              riskID,
			CurrentStatus:         "pending",
			CurrentApproverRole:   "pimpinan",
			CurrentApproverUserID: &pimpinanID,
		},
		currentStep: &entity.ApprovalStep{
			ID:             uuid.New(),
			StepType:       "approval",
			ApproverUserID: pimpinanID,
		},
	}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    pimpinanID.String(),
		ActorName:  "Pimpinan User",
		ActorRole:  "pimpinan",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.updatedRiskStatus != entity.RiskStatusApproved {
		t.Fatalf("expected risk status %q, got %q", entity.RiskStatusApproved, riskRepo.updatedRiskStatus)
	}
}

func TestApprovalActionUseCase_RejectFromInReview_SetsStatusToDraft(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	reviewerID := uuid.MustParse("10000000-0000-0000-0000-000000000004")

	approvalRepo := &fakeApprovalRepo{request: &entity.ApprovalRequest{
		ID:                    approvalID,
		RequestType:           "risk",
		EntityID:              riskID,
		CurrentStatus:         "pending",
		CurrentApproverRole:   "reviewer",
		CurrentApproverUserID: &reviewerID,
	}}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "reject",
		ActorID:    reviewerID.String(),
		ActorName:  "Reviewer User",
		ActorRole:  "reviewer",
		Comments:   "Needs more details",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.updatedRiskStatus != entity.RiskStatusDraft {
		t.Fatalf("expected risk status %q after rejection, got %q", entity.RiskStatusDraft, riskRepo.updatedRiskStatus)
	}
}

func TestApprovalActionUseCase_RejectFromInReview_ByPimpinan_SetsStatusToDraft(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	pimpinanID := uuid.MustParse("10000000-0000-0000-0000-000000000005")

	approvalRepo := &fakeApprovalRepo{request: &entity.ApprovalRequest{
		ID:                    approvalID,
		RequestType:           "risk",
		EntityID:              riskID,
		CurrentStatus:         "pending",
		CurrentApproverRole:   "pimpinan",
		CurrentApproverUserID: &pimpinanID,
	}}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "reject",
		ActorID:    pimpinanID.String(),
		ActorName:  "Pimpinan User",
		ActorRole:  "pimpinan",
		Comments:   "Not approved",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.updatedRiskStatus != entity.RiskStatusDraft {
		t.Fatalf("expected risk status %q after rejection, got %q", entity.RiskStatusDraft, riskRepo.updatedRiskStatus)
	}
}

func TestApprovalActionUseCase_RejectsActorOutsideCurrentPendingStep(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	reviewerID := uuid.MustParse("10000000-0000-0000-0000-000000000004")
	otherReviewerID := uuid.MustParse("10000000-0000-0000-0000-000000000009")

	approvalRepo := &fakeApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                    approvalID,
			RequestType:           "risk",
			EntityID:              riskID,
			CurrentStatus:         "pending",
			CurrentApproverRole:   "reviewer",
			CurrentApproverUserID: &reviewerID,
		},
		currentStep: &entity.ApprovalStep{
			ID:             uuid.New(),
			StepType:       "review",
			ApproverUserID: reviewerID,
		},
	}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    otherReviewerID.String(),
		ActorName:  "Other Reviewer",
		ActorRole:  "reviewer",
	})
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden error for non-current approver, got %v", err)
	}
	if riskRepo.updatedRiskStatus != "" {
		t.Fatalf("expected no risk status update, got %q", riskRepo.updatedRiskStatus)
	}
	if approvalRepo.updatedStatus != "" {
		t.Fatalf("expected approval request status to remain unchanged, got %q", approvalRepo.updatedStatus)
	}
	if len(approvalRepo.histories) != 0 {
		t.Fatalf("expected no approval history on forbidden action, got %d", len(approvalRepo.histories))
	}
}

func TestApprovalActionUseCase_AllowsCurrentPendingStepDespiteRoleMismatch(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	pimpinanID := uuid.MustParse("10000000-0000-0000-0000-000000000005")

	approvalRepo := &fakeApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                    approvalID,
			RequestType:           "risk",
			EntityID:              riskID,
			CurrentStatus:         "pending",
			CurrentApproverRole:   "pimpinan",
			CurrentApproverUserID: &pimpinanID,
		},
		currentStep: &entity.ApprovalStep{
			ID:             uuid.New(),
			StepType:       "approval",
			ApproverUserID: pimpinanID,
		},
	}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
	}}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, &fakeApprovalMitigationTaskRepo{})
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    pimpinanID.String(),
		ActorName:  "Pimpinan User",
		ActorRole:  "reviewer",
	})
	if err != nil {
		t.Fatalf("expected no error for current approver role mismatch, got %v", err)
	}
	if riskRepo.updatedRiskStatus != entity.RiskStatusApproved {
		t.Fatalf("expected risk status %q, got %q", entity.RiskStatusApproved, riskRepo.updatedRiskStatus)
	}
	if approvalRepo.updatedStatus != "approved" {
		t.Fatalf("expected approval request status 'approved', got %q", approvalRepo.updatedStatus)
	}
	if len(approvalRepo.histories) != 1 {
		t.Fatalf("expected one approval history entry, got %d", len(approvalRepo.histories))
	}
	if approvalRepo.histories[0].ActorRole != "reviewer" {
		t.Fatalf("expected actor role to be recorded as reviewer, got %q", approvalRepo.histories[0].ActorRole)
	}
}

func TestApprovalActionUseCase_FinalApprovalCreatesMitigationTasks(t *testing.T) {
	approvalID := uuid.New()
	riskID := uuid.New()
	pimpinanID := uuid.MustParse("10000000-0000-0000-0000-000000000006")
	dueDate := "2026-06-10"

	approvalRepo := &fakeApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                    approvalID,
			RequestType:           "risk",
			EntityID:              riskID,
			CurrentStatus:         "pending",
			CurrentApproverRole:   "pimpinan",
			CurrentApproverUserID: &pimpinanID,
		},
		currentStep: &entity.ApprovalStep{
			ID:             uuid.New(),
			StepType:       "approval",
			ApproverUserID: pimpinanID,
		},
	}
	riskRepo := &fakeApprovalRiskRepo{risk: &entity.Risk{
		ID:     riskID,
		Status: entity.RiskStatusInReview,
		Mitigations: []entity.Mitigation{
			{ID: uuid.New(), RiskID: riskID, Action: "Mitigasi A", Owner: "PIC A", DueDate: &dueDate},
		},
	}}
	taskRepo := &fakeApprovalMitigationTaskRepo{}

	uc := NewApprovalActionUseCase(approvalRepo, riskRepo, &fakeApprovalIncidentRepo{}, taskRepo)
	_, err := uc.Execute(context.Background(), ApprovalActionInput{
		ApprovalID: approvalID.String(),
		Action:     "approve",
		ActorID:    pimpinanID.String(),
		ActorName:  "Pimpinan User",
		ActorRole:  "pimpinan",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(taskRepo.created) != 1 {
		t.Fatalf("expected 1 mitigation task, got %d", len(taskRepo.created))
	}
}
