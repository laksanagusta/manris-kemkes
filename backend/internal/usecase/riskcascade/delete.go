package riskcascade

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type DeleteUseCase struct {
	repo repository.RiskCascadeRepository
}

type DeleteInput struct {
	ID     uuid.UUID
	OrgIDs []uuid.UUID
}

func NewDeleteUseCase(repo repository.RiskCascadeRepository) *DeleteUseCase {
	return &DeleteUseCase{repo: repo}
}

func (uc *DeleteUseCase) Execute(ctx context.Context, input DeleteInput) error {
	if input.ID == uuid.Nil {
		return errors.ErrInvalidInput
	}
	cascade, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return errors.ErrNotFound
	}
	if !isOrgAccessible(cascade.TargetOrgID, input.OrgIDs) {
		return errors.ErrForbidden
	}
	if cascade.Status != "proposed" {
		return errors.ErrOnlyProposedCascadeDeleted
	}
	if err := uc.repo.Delete(ctx, input.ID); err != nil {
		return errors.Wrap(err, "failed to delete risk cascade")
	}
	return nil
}
