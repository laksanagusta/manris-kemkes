package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

type monitoringDeletionRepository interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoring, error)
	DeleteDraft(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) error
}

// DeleteMonitoringUseCase removes an in-progress monitoring transaction.
// Finalized monitoring records are immutable and must remain available for audit.
type DeleteMonitoringUseCase struct {
	monitoringRepo monitoringDeletionRepository
}

func NewDeleteMonitoringUseCase(monitoringRepo monitoringDeletionRepository) *DeleteMonitoringUseCase {
	return &DeleteMonitoringUseCase{monitoringRepo: monitoringRepo}
}

type DeleteMonitoringOutput struct {
	Message string `json:"message"`
}

func (uc *DeleteMonitoringUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*DeleteMonitoringOutput, error) {
	if id == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	monitoring, err := uc.monitoringRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, errors.ErrMonitoringNotDeletable
	}

	if err := uc.monitoringRepo.DeleteDraft(ctx, id, orgIDs); err != nil {
		return nil, err
	}

	return &DeleteMonitoringOutput{Message: "Draf pemantauan berhasil dihapus"}, nil
}
