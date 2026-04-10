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

type fakeGetByEntityApprovalRepo struct {
	request   *entity.ApprovalRequest
	histories []*entity.ApprovalHistory
}

func (r *fakeGetByEntityApprovalRepo) List(context.Context, string, string, *uuid.UUID, []uuid.UUID) ([]*entity.ApprovalRequest, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) FindByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.ApprovalRequest, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) FindByEntity(context.Context, string, uuid.UUID, []uuid.UUID) (*entity.ApprovalRequest, error) {
	if r.request == nil {
		return nil, domainerrors.ErrNotFound
	}
	return r.request, nil
}
func (r *fakeGetByEntityApprovalRepo) GetHistoryByEntity(context.Context, string, uuid.UUID) ([]*entity.ApprovalHistory, error) {
	return r.histories, nil
}
func (r *fakeGetByEntityApprovalRepo) Create(context.Context, *entity.ApprovalRequest) error {
	return errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) UpdateStatus(context.Context, uuid.UUID, string) error {
	return errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) AddHistory(context.Context, *entity.ApprovalHistory) error {
	return errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) GetHistory(context.Context, uuid.UUID) ([]*entity.ApprovalHistory, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) GetPendingCount(context.Context, string, *uuid.UUID, []uuid.UUID) (int, error) {
	return 0, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) CreateSteps(context.Context, uuid.UUID, []entity.ApprovalStep) error {
	return errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) GetSteps(context.Context, uuid.UUID) ([]*entity.ApprovalStep, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) ApproveCurrentStep(context.Context, uuid.UUID, uuid.UUID, string) (*entity.ApprovalStep, *entity.ApprovalStep, error) {
	return nil, nil, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) RejectCurrentStep(context.Context, uuid.UUID, uuid.UUID, string) error {
	return errors.New("not implemented")
}

var _ repo.ApprovalRepository = (*fakeGetByEntityApprovalRepo)(nil)

func TestGetApprovalByEntityUseCase_MapsStepType(t *testing.T) {
	requestID := uuid.New()
	entityID := uuid.New()
	approverID := uuid.New()
	now := time.Date(2026, 4, 8, 12, 0, 0, 0, time.UTC)

	repo := &fakeGetByEntityApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                  requestID,
			RequestType:         "risk",
			EntityID:            entityID,
			RequestedBy:         uuid.New(),
			RequestedByName:     "riska",
			RequestedAt:         now,
			CurrentStatus:       "pending",
			CurrentApproverRole: "reviewer",
			Notes:               "Submitted",
			CreatedAt:           now,
			UpdatedAt:           now,
			Steps: []entity.ApprovalStep{{
				ID:                uuid.New(),
				ApprovalRequestID: requestID,
				SequenceNo:        1,
				ApproverUserID:    approverID,
				ApproverName:      "Dr. Farah Indah",
				ApproverRole:      "reviewer",
				StepType:          "review",
				Status:            "pending",
				CreatedAt:         now,
				UpdatedAt:         now,
			}},
		},
	}

	uc := NewGetApprovalByEntityUseCase(repo)
	result, err := uc.Execute(context.Background(), GetApprovalByEntityInput{
		RequestType: "risk",
		EntityID:    entityID.String(),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(result.Steps))
	}
	if result.Steps[0].StepType != "review" {
		t.Fatalf("expected stepType 'review', got %q", result.Steps[0].StepType)
	}
}
