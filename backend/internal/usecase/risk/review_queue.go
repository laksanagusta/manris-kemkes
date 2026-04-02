package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type ListRiskReviewQueueUseCase struct {
	riskRepo repository.RiskRepository
	orgSvc   *service.OrganizationHierarchy
}

func NewListRiskReviewQueueUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRiskReviewQueueUseCase {
	return &ListRiskReviewQueueUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type ListRiskReviewQueueInput struct {
	Cycle  string
	OrgID  *uuid.UUID
	Status string
}

func (uc *ListRiskReviewQueueUseCase) Execute(ctx context.Context, input ListRiskReviewQueueInput) ([]*entity.RiskReviewQueueItem, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}
	if input.Status == "" {
		input.Status = "all"
	}
	var orgIDs []uuid.UUID
	var err error

	if input.OrgID != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}

	items, err := uc.riskRepo.ListReviewQueue(ctx, input.Cycle, orgIDs, input.Status)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk review queue")
	}
	return items, nil
}
