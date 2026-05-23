package workingpaper

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

// SkipTTE finalizes a draft working paper without electronic signatures.
func (uc *UseCase) SkipTTE(ctx context.Context, workingPaperID uuid.UUID, userID uuid.UUID) (*entity.WorkingPaper, error) {
	wp, err := uc.wpRepo.MutateByIDForUpdate(ctx, workingPaperID, func(wp *entity.WorkingPaper) error {
		if wp.CreatedBy != userID {
			return domainerrors.ErrForbidden
		}
		if wp.Status != entity.WorkingPaperStatusDraft {
			return &domainerrors.AppError{
				Code:    "INVALID_STATUS",
				Message: "only draft working papers can skip TTE",
			}
		}
		if wp.TTESkipped {
			return &domainerrors.AppError{
				Code:    "INVALID_STATUS",
				Message: "working paper already skipped TTE",
			}
		}
		for _, link := range wp.Risks {
			if link.Risk.Status != entity.RiskStatusApproved {
				return &domainerrors.AppError{
					Code:    "RISKS_NOT_APPROVED",
					Message: "semua risiko harus berstatus approved sebelum TTE dapat dilewati",
				}
			}
		}

		wp.SkipTTE()
		return nil
	})
	if err != nil {
		return nil, err
	}

	return wp, nil
}
