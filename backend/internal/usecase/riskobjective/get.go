package riskobjective

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetRiskObjectiveUseCase struct {
	repo repository.RiskObjectiveRepository
}

func NewGetRiskObjectiveUseCase(repo repository.RiskObjectiveRepository) *GetRiskObjectiveUseCase {
	return &GetRiskObjectiveUseCase{repo: repo}
}

func (uc *GetRiskObjectiveUseCase) Execute(ctx context.Context, id uuid.UUID) (*entity.RiskObjective, error) {
	objective, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	return objective, nil
}