package workingpaper

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func (uc *UseCase) List(ctx context.Context, orgIDs []uuid.UUID, status, query, assessmentCycle string, page, limit int) ([]*entity.WorkingPaper, int, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	wps, total, err := uc.wpRepo.List(ctx, orgIDs, status, query, assessmentCycle, page, limit)
	if err != nil {
		return nil, 0, domainerrors.Wrap(err, "failed to list working papers")
	}

	if wps == nil {
		wps = make([]*entity.WorkingPaper, 0)
	}

	return wps, total, nil
}
