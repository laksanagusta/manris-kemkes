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
	orgSvc   *service.OrganizationHierarchy
}

func NewListRisksUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRisksUseCase {
	return &ListRisksUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type ListRisksInput struct {
	OrgID    *uuid.UUID
	Status   string
	Category string
}

func (uc *ListRisksUseCase) Execute(ctx context.Context, input ListRisksInput) ([]*entity.Risk, error) {
	var orgIDs []uuid.UUID
	var err error

	if input.OrgID != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}

	risks, err := uc.riskRepo.List(ctx, orgIDs, input.Status, input.Category)
	if err != nil {
		return nil, err
	}

	return risks, nil
}
