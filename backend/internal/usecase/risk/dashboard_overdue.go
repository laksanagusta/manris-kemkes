package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type OverdueMitigationTimelineUseCase struct {
	riskRepo repository.RiskRepository
}

func NewOverdueMitigationTimelineUseCase(riskRepo repository.RiskRepository) *OverdueMitigationTimelineUseCase {
	return &OverdueMitigationTimelineUseCase{riskRepo: riskRepo}
}

type OverdueMitigationTimelineInput struct {
	OrgIDs []uuid.UUID
}

func (uc *OverdueMitigationTimelineUseCase) Execute(ctx context.Context, input OverdueMitigationTimelineInput) ([]entity.OverdueMitigationTimelineItem, error) {
	return uc.riskRepo.GetOverdueMitigationTimeline(ctx, input.OrgIDs)
}
