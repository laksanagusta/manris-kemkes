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
}

func NewListRiskReviewQueueUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRiskReviewQueueUseCase {
	return &ListRiskReviewQueueUseCase{
		riskRepo: riskRepo,
	}
}

type ListRiskReviewQueueInput struct {
	Cycle  string
	OrgIDs []uuid.UUID
	Status string
}

func (uc *ListRiskReviewQueueUseCase) Execute(ctx context.Context, input ListRiskReviewQueueInput) ([]*entity.RiskReviewQueueItem, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}
	if input.Status == "" {
		input.Status = "all"
	}

	items, err := uc.riskRepo.ListReviewQueue(ctx, input.Cycle, input.OrgIDs, input.Status)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk review queue")
	}
	return items, nil
}
