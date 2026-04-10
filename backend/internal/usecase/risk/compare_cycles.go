package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type CompareRiskCyclesUseCase struct {
	riskRepo repository.RiskRepository
}

func NewCompareRiskCyclesUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *CompareRiskCyclesUseCase {
	return &CompareRiskCyclesUseCase{
		riskRepo: riskRepo,
	}
}

type CompareRiskCyclesInput struct {
	FromCycle string
	ToCycle   string
	OrgIDs    []uuid.UUID
}

func (uc *CompareRiskCyclesUseCase) Execute(ctx context.Context, input CompareRiskCyclesInput) ([]*entity.RiskCycleComparisonItem, error) {
	if input.FromCycle == "" || input.ToCycle == "" {
		return nil, errors.ErrInvalidInput
	}

	items, err := uc.riskRepo.CompareCycles(ctx, input.FromCycle, input.ToCycle, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to compare risk cycles")
	}
	return items, nil
}
