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
	orgSvc   *service.OrganizationHierarchy
}

func NewCompareRiskCyclesUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *CompareRiskCyclesUseCase {
	return &CompareRiskCyclesUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type CompareRiskCyclesInput struct {
	FromCycle string
	ToCycle   string
	OrgID     *uuid.UUID
}

func (uc *CompareRiskCyclesUseCase) Execute(ctx context.Context, input CompareRiskCyclesInput) ([]*entity.RiskCycleComparisonItem, error) {
	if input.FromCycle == "" || input.ToCycle == "" {
		return nil, errors.ErrInvalidInput
	}
	var orgIDs []uuid.UUID
	var err error

	if input.OrgID != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}

	items, err := uc.riskRepo.CompareCycles(ctx, input.FromCycle, input.ToCycle, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to compare risk cycles")
	}
	return items, nil
}
