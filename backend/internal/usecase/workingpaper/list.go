package workingpaper

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func (uc *UseCase) List(ctx context.Context, orgIDs []uuid.UUID, status, query, assessmentCycle, createdAt string, page, limit int, sorting ...string) ([]*entity.WorkingPaper, int, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	var wps []*entity.WorkingPaper
	var total int
	var err error
	if repo, ok := uc.wpRepo.(interface {
		ListSorted(context.Context, []uuid.UUID, string, string, string, string, int, int, string, string) ([]*entity.WorkingPaper, int, error)
	}); ok && len(sorting) == 2 {
		wps, total, err = repo.ListSorted(ctx, orgIDs, status, query, assessmentCycle, createdAt, page, limit, sorting[0], sorting[1])
	} else {
		wps, total, err = uc.wpRepo.List(ctx, orgIDs, status, query, assessmentCycle, createdAt, page, limit)
	}
	if err != nil {
		return nil, 0, domainerrors.Wrap(err, "failed to list working papers")
	}

	if wps == nil {
		wps = make([]*entity.WorkingPaper, 0)
	}

	return wps, total, nil
}
