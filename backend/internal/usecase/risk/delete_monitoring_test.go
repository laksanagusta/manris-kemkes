package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type deleteMonitoringRepoStub struct {
	monitoring *entity.RiskMonitoring
	getErr     error
	deleteErr  error
	deleted    bool
}

func (s *deleteMonitoringRepoStub) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.RiskMonitoring, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	return s.monitoring, nil
}

func (s *deleteMonitoringRepoStub) DeleteDraft(context.Context, uuid.UUID, []uuid.UUID) error {
	if s.deleteErr != nil {
		return s.deleteErr
	}
	s.deleted = true
	return nil
}

func TestDeleteMonitoringUseCaseDeletesDraft(t *testing.T) {
	monitoring := &entity.RiskMonitoring{ID: uuid.New(), Status: entity.RiskMonitoringStatusDraft}
	repo := &deleteMonitoringRepoStub{monitoring: monitoring}
	uc := NewDeleteMonitoringUseCase(repo)

	result, err := uc.Execute(context.Background(), monitoring.ID, nil)
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if !repo.deleted {
		t.Fatal("DeleteDraft was not called")
	}
	if result == nil || result.Message == "" {
		t.Fatal("expected success message")
	}
}

func TestDeleteMonitoringUseCaseRejectsFinalizedMonitoring(t *testing.T) {
	monitoring := &entity.RiskMonitoring{ID: uuid.New(), Status: entity.RiskMonitoringStatusFinalized}
	repo := &deleteMonitoringRepoStub{monitoring: monitoring}
	uc := NewDeleteMonitoringUseCase(repo)

	_, err := uc.Execute(context.Background(), monitoring.ID, nil)
	if err != domainerrors.ErrMonitoringNotDeletable {
		t.Fatalf("Execute() error = %v, want %v", err, domainerrors.ErrMonitoringNotDeletable)
	}
	if repo.deleted {
		t.Fatal("finalized monitoring must not be deleted")
	}
}

func TestDeleteMonitoringUseCaseMapsMissingMonitoring(t *testing.T) {
	repo := &deleteMonitoringRepoStub{getErr: domainerrors.ErrRiskNotFound}
	uc := NewDeleteMonitoringUseCase(repo)

	_, err := uc.Execute(context.Background(), uuid.New(), nil)
	if err != domainerrors.ErrRiskNotFound {
		t.Fatalf("Execute() error = %v, want %v", err, domainerrors.ErrRiskNotFound)
	}
}
