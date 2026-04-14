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
	Search string
	Page   int
	Limit  int
}

type ListRiskReviewQueueResult struct {
	Data  []*entity.RiskReviewQueueItem `json:"data"`
	Total int                           `json:"total"`
	Page  int                           `json:"page"`
	Limit int                           `json:"limit"`
}

func (uc *ListRiskReviewQueueUseCase) Execute(ctx context.Context, input ListRiskReviewQueueInput) (*ListRiskReviewQueueResult, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}
	if input.Status == "" {
		input.Status = "all"
	}
	if input.Page <= 0 {
		input.Page = 1
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}

	items, total, err := uc.riskRepo.ListReviewQueue(ctx, input.Cycle, input.OrgIDs, input.Status, input.Search, input.Page, input.Limit)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk review queue")
	}
	if items == nil {
		items = []*entity.RiskReviewQueueItem{}
	}
	return &ListRiskReviewQueueResult{
		Data:  items,
		Total: total,
		Page:  input.Page,
		Limit: input.Limit,
	}, nil
}
