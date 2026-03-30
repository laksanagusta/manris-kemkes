package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// ListRisksUseCase retrieves a list of risks with optional filters
type ListRisksUseCase struct {
	riskRepo repository.RiskRepository
}

func NewListRisksUseCase(riskRepo repository.RiskRepository) *ListRisksUseCase {
	return &ListRisksUseCase{
		riskRepo: riskRepo,
	}
}

type ListRisksInput struct {
	OrgID  *uuid.UUID
	Status string
}

func (uc *ListRisksUseCase) Execute(ctx context.Context, input ListRisksInput) ([]*entity.Risk, error) {
	risks, err := uc.riskRepo.List(ctx, input.OrgID, input.Status)
	if err != nil {
		return nil, err
	}

	return risks, nil
}
