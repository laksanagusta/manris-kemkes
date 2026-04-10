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
}

func NewRiskReviewSummaryUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *RiskReviewSummaryUseCase {
	return &RiskReviewSummaryUseCase{
		riskRepo: riskRepo,
	}
}

type RiskReviewSummaryInput struct {
	Cycle  string
	OrgIDs []uuid.UUID
}

func (uc *RiskReviewSummaryUseCase) Execute(ctx context.Context, input RiskReviewSummaryInput) (*entity.RiskReviewSummary, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}

	summary, err := uc.riskRepo.RiskReviewSummary(ctx, input.Cycle, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk review summary")
	}
	return summary, nil
}
