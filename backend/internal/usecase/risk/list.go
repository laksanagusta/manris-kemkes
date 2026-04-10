package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

// ListRisksUseCase retrieves a list of risks with optional filters
type ListRisksUseCase struct {
	riskRepo repository.RiskRepository
}

func NewListRisksUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRisksUseCase {
	return &ListRisksUseCase{
		riskRepo: riskRepo,
	}
}

type ListRisksInput struct {
	OrgIDs   []uuid.UUID
	Status   string
	Category string
}

func (uc *ListRisksUseCase) Execute(ctx context.Context, input ListRisksInput) ([]*entity.Risk, error) {
	risks, err := uc.riskRepo.List(ctx, input.OrgIDs, input.Status, input.Category)
	if err != nil {
		return nil, err
	}

	return risks, nil
}
