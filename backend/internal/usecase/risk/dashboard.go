package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type DashboardSummaryInput struct {
	Cycle  string
	OrgIDs []uuid.UUID
}

type DashboardSummaryOutput struct {
	Summary *entity.DashboardSummary
}

type DashboardSummaryUseCase struct {
	riskRepo repository.RiskRepository
}

func NewDashboardSummaryUseCase(riskRepo repository.RiskRepository) *DashboardSummaryUseCase {
	return &DashboardSummaryUseCase{
		riskRepo: riskRepo,
	}
}

func (uc *DashboardSummaryUseCase) Execute(ctx context.Context, input DashboardSummaryInput) (*DashboardSummaryOutput, error) {
	summary, err := uc.riskRepo.DashboardSummary(ctx, input.Cycle, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return &DashboardSummaryOutput{Summary: summary}, nil
}

type HeatmapDataInput struct {
	Cycle  string
	OrgIDs []uuid.UUID
}

type HeatmapDataOutput struct {
	Data []*entity.HeatmapCell
}

type HeatmapDataUseCase struct {
	riskRepo repository.RiskRepository
}

func NewHeatmapDataUseCase(riskRepo repository.RiskRepository) *HeatmapDataUseCase {
	return &HeatmapDataUseCase{
		riskRepo: riskRepo,
	}
}

func (uc *HeatmapDataUseCase) Execute(ctx context.Context, input HeatmapDataInput) (*HeatmapDataOutput, error) {
	data, err := uc.riskRepo.HeatmapData(ctx, input.Cycle, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return &HeatmapDataOutput{Data: data}, nil
}

type TopRisksInput struct {
	Cycle  string
	Limit  int
	OrgIDs []uuid.UUID
}

type TopRisksOutput struct {
	Risks []*entity.Risk
}

type TopRisksUseCase struct {
	riskRepo repository.RiskRepository
}

func NewTopRisksUseCase(riskRepo repository.RiskRepository) *TopRisksUseCase {
	return &TopRisksUseCase{
		riskRepo: riskRepo,
	}
}

func (uc *TopRisksUseCase) Execute(ctx context.Context, input TopRisksInput) (*TopRisksOutput, error) {
	if input.Limit <= 0 {
		input.Limit = 10
	}

	risks, err := uc.riskRepo.TopRisks(ctx, input.Cycle, input.Limit, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return &TopRisksOutput{Risks: risks}, nil
}
