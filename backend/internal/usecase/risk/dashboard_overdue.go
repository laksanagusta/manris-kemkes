package risk

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type OverdueMitigationTimelineUseCase struct {
	riskRepo repository.RiskRepository
}

func NewOverdueMitigationTimelineUseCase(riskRepo repository.RiskRepository) *OverdueMitigationTimelineUseCase {
	return &OverdueMitigationTimelineUseCase{riskRepo: riskRepo}
}

func (uc *OverdueMitigationTimelineUseCase) Execute(ctx context.Context) ([]entity.OverdueMitigationTimelineItem, error) {
	return uc.riskRepo.GetOverdueMitigationTimeline(ctx)
}
