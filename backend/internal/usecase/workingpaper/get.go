package workingpaper

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

// Get retrieves a working paper by ID and verifies org access.
func (uc *UseCase) Get(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.WorkingPaper, error) {
	wp, err := uc.wpRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainerrors.ErrNotFound
	}

	if !orgContains(orgIDs, wp.OrgID) {
		return nil, domainerrors.ErrForbidden
	}

	return wp, nil
}

func orgContains(orgIDs []uuid.UUID, target uuid.UUID) bool {
	for _, id := range orgIDs {
		if id == target {
			return true
		}
	}
	return false
}
