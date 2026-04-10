package workingpaper

import (
	"context"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

// Delete removes a draft working paper if the caller is the creator.
func (uc *UseCase) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	wp, err := uc.wpRepo.GetByID(ctx, id)
	if err != nil {
		return domainerrors.ErrNotFound
	}

	if !wp.CanDelete() {
		return &domainerrors.AppError{
			Code:    "INVALID_STATUS",
			Message: "only draft working papers can be deleted",
		}
	}

	if wp.CreatedBy != userID {
		return domainerrors.ErrForbidden
	}

	if err := uc.wpRepo.Delete(ctx, id); err != nil {
		return domainerrors.Wrap(err, "failed to delete working paper")
	}

	return nil
}
