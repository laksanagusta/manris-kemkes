package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type RiskReviewSummaryUseCase struct {
	riskRepo repository.RiskRepository
	orgSvc   *service.OrganizationHierarchy
}

func NewRiskReviewSummaryUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *RiskReviewSummaryUseCase {
	return &RiskReviewSummaryUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type RiskReviewSummaryInput struct {
	Cycle string
	OrgID *uuid.UUID
}

func (uc *RiskReviewSummaryUseCase) Execute(ctx context.Context, input RiskReviewSummaryInput) (*entity.RiskReviewSummary, error) {
	if input.Cycle == "" {
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

	summary, err := uc.riskRepo.RiskReviewSummary(ctx, input.Cycle, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk review summary")
	}
	return summary, nil
}
