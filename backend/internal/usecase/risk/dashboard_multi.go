package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// HeatmapMultiInput is the input for HeatmapMultiUseCase.
type HeatmapMultiInput struct {
	Year   int
	OrgIDs []uuid.UUID
}

// HeatmapMultiUseCase returns four 5x5 heatmap matrices (initial/S1/S2/target)
// for a given assessment year, scoped to the provided organization IDs.
type HeatmapMultiUseCase struct {
	riskRepo repository.RiskRepository
}

// NewHeatmapMultiUseCase constructs a new HeatmapMultiUseCase.
func NewHeatmapMultiUseCase(repo repository.RiskRepository) *HeatmapMultiUseCase {
	return &HeatmapMultiUseCase{riskRepo: repo}
}

// Execute fetches the multi-phase heatmap for the given year.
func (uc *HeatmapMultiUseCase) Execute(ctx context.Context, input HeatmapMultiInput) (*entity.HeatmapMultiPhase, error) {
	return uc.riskRepo.HeatmapMultiPhase(ctx, input.Year, input.OrgIDs)
}
