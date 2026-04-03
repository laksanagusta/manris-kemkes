package risk

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type HeatmapVelocityUseCase struct {
	riskRepo repository.RiskRepository
}

func NewHeatmapVelocityUseCase(riskRepo repository.RiskRepository) *HeatmapVelocityUseCase {
	return &HeatmapVelocityUseCase{riskRepo: riskRepo}
}

type HeatmapVelocityInput struct {
	FromCycle string
	ToCycle   string
}

func (uc *HeatmapVelocityUseCase) Execute(ctx context.Context, input HeatmapVelocityInput) ([]entity.HeatmapVelocityCell, error) {
	if input.FromCycle == "" || input.ToCycle == "" {
		return []entity.HeatmapVelocityCell{}, nil
	}
	return uc.riskRepo.GetHeatmapVelocity(ctx, input.FromCycle, input.ToCycle)
}
