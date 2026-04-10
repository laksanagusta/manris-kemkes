package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type KRIBreachSummaryUseCase struct {
	riskRepo repository.RiskRepository
}

func NewKRIBreachSummaryUseCase(riskRepo repository.RiskRepository) *KRIBreachSummaryUseCase {
	return &KRIBreachSummaryUseCase{riskRepo: riskRepo}
}

type KRIBreachSummaryInput struct {
	OrgIDs []uuid.UUID
}

func (uc *KRIBreachSummaryUseCase) Execute(ctx context.Context, input KRIBreachSummaryInput) ([]entity.KRIBreachItem, error) {
	return uc.riskRepo.GetKRIBreachSummary(ctx, input.OrgIDs)
}
