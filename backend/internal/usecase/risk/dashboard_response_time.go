package risk

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type UnitResponseTimeUseCase struct {
	riskRepo repository.RiskRepository
}

func NewUnitResponseTimeUseCase(riskRepo repository.RiskRepository) *UnitResponseTimeUseCase {
	return &UnitResponseTimeUseCase{riskRepo: riskRepo}
}

func (uc *UnitResponseTimeUseCase) Execute(ctx context.Context) ([]entity.UnitResponseTime, error) {
	return uc.riskRepo.GetUnitResponseTime(ctx)
}
