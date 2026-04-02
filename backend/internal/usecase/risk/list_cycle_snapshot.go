package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type ListRiskCycleSnapshotUseCase struct {
	riskRepo repository.RiskRepository
	orgSvc   *service.OrganizationHierarchy
}

func NewListRiskCycleSnapshotUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRiskCycleSnapshotUseCase {
	return &ListRiskCycleSnapshotUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type ListRiskCycleSnapshotInput struct {
	Cycle string
	OrgID *uuid.UUID
}

func (uc *ListRiskCycleSnapshotUseCase) Execute(ctx context.Context, input ListRiskCycleSnapshotInput) ([]*entity.Risk, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}

	var orgIDs []uuid.UUID
	var err error
	if input.OrgID != nil && uc.orgSvc != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}

	items, err := uc.riskRepo.ListCycleSnapshot(ctx, input.Cycle, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk cycle snapshot")
	}

	return items, nil
}
