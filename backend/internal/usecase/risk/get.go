package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetRiskUseCase retrieves a single risk by ID
type GetRiskUseCase struct {
	riskRepo repository.RiskRepository
}

func NewGetRiskUseCase(riskRepo repository.RiskRepository) *GetRiskUseCase {
	return &GetRiskUseCase{
		riskRepo: riskRepo,
	}
}

func (uc *GetRiskUseCase) Execute(ctx context.Context, id uuid.UUID) (*entity.Risk, error) {
	risk, err := uc.riskRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}

	return risk, nil
}
