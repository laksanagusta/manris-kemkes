package workingpaper

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func (uc *UseCase) Cancel(ctx context.Context, workingPaperID uuid.UUID, scope *entity.AccessScope) error {
	if scope == nil || scope.UserID == uuid.Nil {
		return domainerrors.ErrForbidden
	}
	_, err := uc.wpRepo.MutateByIDForUpdate(ctx, workingPaperID, func(wp *entity.WorkingPaper) error {
		if wp.CreatedBy != scope.UserID || !scope.CanRead(wp.OrgID) {
			return domainerrors.ErrForbidden
		}
		if !wp.CanCancel() {
			return &domainerrors.AppError{
				Code:    "INVALID_STATUS",
				Message: "only draft or signing working papers can be cancelled",
			}
		}

		now := time.Now()
		wp.Status = entity.WorkingPaperStatusCancelled
		wp.CancelledAt = &now
		wp.UpdatedAt = now
		return nil
	})
	return err
}
