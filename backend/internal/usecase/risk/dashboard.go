package risk

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// DashboardSummaryUseCase retrieves dashboard KPI data
type DashboardSummaryUseCase struct {
	riskRepo repository.RiskRepository
}

func NewDashboardSummaryUseCase(riskRepo repository.RiskRepository) *DashboardSummaryUseCase {
	return &DashboardSummaryUseCase{
		riskRepo: riskRepo,
	}
}

func (uc *DashboardSummaryUseCase) Execute(ctx context.Context) (*entity.DashboardSummary, error) {
	summary, err := uc.riskRepo.DashboardSummary(ctx)
	if err != nil {
		return nil, err
	}

	return summary, nil
}

// HeatmapDataUseCase retrieves risk distribution for heatmap
type HeatmapDataUseCase struct {
	riskRepo repository.RiskRepository
}

func NewHeatmapDataUseCase(riskRepo repository.RiskRepository) *HeatmapDataUseCase {
	return &HeatmapDataUseCase{
		riskRepo: riskRepo,
	}
}

func (uc *HeatmapDataUseCase) Execute(ctx context.Context) ([]*entity.HeatmapCell, error) {
	data, err := uc.riskRepo.HeatmapData(ctx)
	if err != nil {
		return nil, err
	}

	return data, nil
}

// TopRisksUseCase retrieves highest-scoring risks
type TopRisksUseCase struct {
	riskRepo repository.RiskRepository
}

func NewTopRisksUseCase(riskRepo repository.RiskRepository) *TopRisksUseCase {
	return &TopRisksUseCase{
		riskRepo: riskRepo,
	}
}

type TopRisksInput struct {
	Limit int
}

func (uc *TopRisksUseCase) Execute(ctx context.Context, input TopRisksInput) ([]*entity.Risk, error) {
	if input.Limit <= 0 {
		input.Limit = 10 // default limit
	}

	risks, err := uc.riskRepo.TopRisks(ctx, input.Limit)
	if err != nil {
		return nil, err
	}

	return risks, nil
}
