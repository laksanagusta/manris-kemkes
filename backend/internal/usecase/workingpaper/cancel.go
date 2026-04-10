package workingpaper

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func (uc *UseCase) Cancel(ctx context.Context, workingPaperID uuid.UUID, userID uuid.UUID) error {
	wp, err := uc.wpRepo.GetByID(ctx, workingPaperID)
	if err != nil {
		return domainerrors.Wrap(err, "failed to fetch working paper")
	}

	if !wp.CanCancel() {
		return &domainerrors.AppError{
			Code:    "INVALID_STATUS",
			Message: "cannot cancel completed working paper",
		}
	}

	now := time.Now()
	wp.Status = entity.WorkingPaperStatusCancelled
	wp.CancelledAt = &now
	wp.UpdatedAt = now

	if err := uc.wpRepo.Update(ctx, wp); err != nil {
		return domainerrors.Wrap(err, "failed to cancel working paper")
	}

	return nil
}
