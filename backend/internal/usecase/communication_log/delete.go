package communication_log

import (
	"context"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// DeleteCommunicationLogUseCase handles deleting communication logs
type DeleteCommunicationLogUseCase struct {
	commLogRepo repository.CommunicationLogRepository
}

// NewDeleteCommunicationLogUseCase creates a new usecase
func NewDeleteCommunicationLogUseCase(commLogRepo repository.CommunicationLogRepository) *DeleteCommunicationLogUseCase {
	return &DeleteCommunicationLogUseCase{
		commLogRepo: commLogRepo,
	}
}

// Input represents the input for deleting a communication log
type DeleteCommunicationLogInput struct {
	ID string
}

// Execute deletes a communication log
func (uc *DeleteCommunicationLogUseCase) Execute(ctx context.Context, input DeleteCommunicationLogInput) error {
	id, err := uuid.Parse(input.ID)
	if err != nil {
		return domainerrors.ErrInvalidInput
	}

	// Verify log exists
	_, err = uc.commLogRepo.FindByID(ctx, id)
	if err != nil {
		return domainerrors.ErrNotFound
	}

	return uc.commLogRepo.Delete(ctx, id)
}
