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

type GetRiskCharterInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *GetRiskCharterUseCase) Execute(ctx context.Context, input GetRiskCharterInput) (*entity.RiskCharter, error) {
	charter, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessRiskCharter(input.Scope, charter.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	return charter, nil
}
