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
	orgSvc   *service.OrganizationHierarchy
}

func NewListApprovedRisksUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListApprovedRisksUseCase {
	return &ListApprovedRisksUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type ListApprovedRisksInput struct {
	OrgID *uuid.UUID
}

func (uc *ListApprovedRisksUseCase) Execute(ctx context.Context, input ListApprovedRisksInput) ([]*entity.Risk, error) {
	var orgIDs []uuid.UUID
	var err error

	if input.OrgID != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}

	risks, err := uc.riskRepo.ListApprovedRisks(ctx, orgIDs)
	if err != nil {
		return nil, err
	}

	return risks, nil
}
