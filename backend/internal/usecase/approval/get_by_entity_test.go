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
	request                 *entity.ApprovalRequest
	histories               []*entity.ApprovalHistory
	findByEntityRequestType string
	findByEntityEntityID    uuid.UUID
	findByEntityOrgIDs      []uuid.UUID
	getHistoryRequestType   string
	getHistoryEntityID      uuid.UUID
}

func (r *fakeGetByEntityApprovalRepo) List(context.Context, string, string, *uuid.UUID, []uuid.UUID, int, int) ([]*entity.ApprovalRequest, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) FindByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.ApprovalRequest, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeGetByEntityApprovalRepo) FindByEntity(_ context.Context, requestType string, entityID uuid.UUID, orgIDs []uuid.UUID) (*entity.ApprovalRequest, error) {
	r.findByEntityRequestType = requestType
	r.findByEntityEntityID = entityID
	r.findByEntityOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	if r.request == nil {
		return nil, domainerrors.ErrNotFound
	}
	return r.request, nil
}
func (r *fakeGetByEntityApprovalRepo) GetHistoryByEntity(_ context.Context, requestType string, entityID uuid.UUID) ([]*entity.ApprovalHistory, error) {
	r.getHistoryRequestType = requestType
	r.getHistoryEntityID = entityID
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

func TestGetApprovalByEntityUseCase_AssessmentForwardsOrgScope(t *testing.T) {
	requestID := uuid.New()
	entityID := uuid.New()
	orgID := uuid.New()
	actorID := uuid.New()
	now := time.Date(2026, 4, 9, 9, 30, 0, 0, time.UTC)

	repo := &fakeGetByEntityApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:              requestID,
			RequestType:     "assessment",
			EntityID:        entityID,
			RequestedBy:     uuid.New(),
			RequestedByName: "Sinta",
			RequestedAt:     now,
			CurrentStatus:   "approved",
			Notes:           "Assessment approval",
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		histories: []*entity.ApprovalHistory{{
			ID:                uuid.New(),
			ApprovalRequestID: requestID,
			Action:            "approved",
			ActorID:           actorID,
			ActorName:         "Reviewer A",
			ActorRole:         "reviewer",
			Comments:          "Cycle reassessment approved",
			CreatedAt:         now,
		}},
	}

	uc := NewGetApprovalByEntityUseCase(repo)
	result, err := uc.Execute(context.Background(), GetApprovalByEntityInput{
		RequestType: "assessment",
		EntityID:    entityID.String(),
		OrgIDs:      []uuid.UUID{orgID},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.RequestType != "assessment" {
		t.Fatalf("expected requestType assessment, got %q", result.RequestType)
	}
	if len(result.History) != 1 {
		t.Fatalf("expected 1 history entry, got %d", len(result.History))
	}
	if repo.findByEntityRequestType != "assessment" {
		t.Fatalf("expected FindByEntity requestType assessment, got %q", repo.findByEntityRequestType)
	}
	if repo.findByEntityEntityID != entityID {
		t.Fatalf("expected FindByEntity entityID %s, got %s", entityID, repo.findByEntityEntityID)
	}
	if len(repo.findByEntityOrgIDs) != 1 || repo.findByEntityOrgIDs[0] != orgID {
		t.Fatalf("expected FindByEntity orgIDs [%s], got %v", orgID, repo.findByEntityOrgIDs)
	}
	if repo.getHistoryRequestType != "assessment" {
		t.Fatalf("expected GetHistoryByEntity requestType assessment, got %q", repo.getHistoryRequestType)
	}
	if repo.getHistoryEntityID != entityID {
		t.Fatalf("expected GetHistoryByEntity entityID %s, got %s", entityID, repo.getHistoryEntityID)
	}
}
