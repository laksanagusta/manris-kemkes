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

type DeleteRiskObjectiveOutput struct {
	ID      uuid.UUID `json:"id"`
	Message string    `json:"message"`
}

func (uc *DeleteRiskObjectiveUseCase) Execute(ctx context.Context, id uuid.UUID) (*DeleteRiskObjectiveOutput, error) {
	if _, err := uc.repo.GetByID(ctx, id); err != nil {
		return nil, errors.ErrNotFound
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return nil, errors.Wrap(err, "failed to delete risk objective")
	}
	return &DeleteRiskObjectiveOutput{ID: id, Message: "Risk objective deleted successfully"}, nil
}
