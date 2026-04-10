package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type UnitResponseTimeUseCase struct {
	riskRepo repository.RiskRepository
}

func NewUnitResponseTimeUseCase(riskRepo repository.RiskRepository) *UnitResponseTimeUseCase {
	return &UnitResponseTimeUseCase{riskRepo: riskRepo}
}

type UnitResponseTimeInput struct {
	OrgIDs []uuid.UUID
}

func (uc *UnitResponseTimeUseCase) Execute(ctx context.Context, input UnitResponseTimeInput) ([]entity.UnitResponseTime, error) {
	return uc.riskRepo.GetUnitResponseTime(ctx, input.OrgIDs)
}
