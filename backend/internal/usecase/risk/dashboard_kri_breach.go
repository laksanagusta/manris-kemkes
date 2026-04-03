package risk

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type KRIBreachSummaryUseCase struct {
	riskRepo repository.RiskRepository
}

func NewKRIBreachSummaryUseCase(riskRepo repository.RiskRepository) *KRIBreachSummaryUseCase {
	return &KRIBreachSummaryUseCase{riskRepo: riskRepo}
}

func (uc *KRIBreachSummaryUseCase) Execute(ctx context.Context) ([]entity.KRIBreachItem, error) {
	return uc.riskRepo.GetKRIBreachSummary(ctx)
}
