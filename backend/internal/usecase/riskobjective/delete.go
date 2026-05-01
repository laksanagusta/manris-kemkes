package riskobjective

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type DeleteRiskObjectiveUseCase struct {
	repo repository.RiskObjectiveRepository
}

func NewDeleteRiskObjectiveUseCase(repo repository.RiskObjectiveRepository) *DeleteRiskObjectiveUseCase {
	return &DeleteRiskObjectiveUseCase{repo: repo}
}

func (uc *DeleteRiskObjectiveUseCase) Execute(ctx context.Context, id uuid.UUID) error {
	if err := uc.repo.Delete(ctx, id); err != nil {
		return errors.ErrNotFound
	}
	return nil
}