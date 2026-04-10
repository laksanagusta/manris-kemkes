package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

// ListApprovedRisksUseCase retrieves all approved risks for trend analysis
type ListApprovedRisksUseCase struct {
	riskRepo repository.RiskRepository
}

func NewListApprovedRisksUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListApprovedRisksUseCase {
	return &ListApprovedRisksUseCase{
		riskRepo: riskRepo,
	}
}

type ListApprovedRisksInput struct {
	OrgIDs []uuid.UUID
}

func (uc *ListApprovedRisksUseCase) Execute(ctx context.Context, input ListApprovedRisksInput) ([]*entity.Risk, error) {
	risks, err := uc.riskRepo.ListApprovedRisks(ctx, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return risks, nil
}
