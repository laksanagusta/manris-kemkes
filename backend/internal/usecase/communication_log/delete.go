package communication_log

import (
	"context"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type DeleteCommunicationLogUseCase struct {
	commLogRepo repository.CommunicationLogRepository
	riskRepo    repository.RiskRepository
}

func NewDeleteCommunicationLogUseCase(
	commLogRepo repository.CommunicationLogRepository,
	riskRepo repository.RiskRepository,
) *DeleteCommunicationLogUseCase {
	return &DeleteCommunicationLogUseCase{
		commLogRepo: commLogRepo,
		riskRepo:    riskRepo,
	}
}

type DeleteCommunicationLogInput struct {
	ID     string
	OrgIDs []uuid.UUID
}

func (uc *DeleteCommunicationLogUseCase) Execute(ctx context.Context, input DeleteCommunicationLogInput) error {
	id, err := uuid.Parse(input.ID)
	if err != nil {
		return domainerrors.ErrInvalidInput
	}

	commLog, err := uc.commLogRepo.FindByID(ctx, id)
	if err != nil {
		return domainerrors.ErrNotFound
	}

	if _, err := uc.riskRepo.GetByID(ctx, commLog.RiskID, input.OrgIDs); err != nil {
		return domainerrors.ErrForbidden
	}

	return uc.commLogRepo.Delete(ctx, id)
}
