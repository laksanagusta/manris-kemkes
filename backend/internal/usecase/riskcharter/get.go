package riskcharter

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetRiskCharterUseCase struct {
	repo repository.RiskCharterRepository
}

func NewGetRiskCharterUseCase(repo repository.RiskCharterRepository) *GetRiskCharterUseCase {
	return &GetRiskCharterUseCase{repo: repo}
}

func (uc *GetRiskCharterUseCase) Execute(ctx context.Context, id uuid.UUID) (*entity.RiskCharter, error) {
	charter, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	return charter, nil
}
