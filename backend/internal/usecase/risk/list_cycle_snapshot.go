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
}

func NewListRiskCycleSnapshotUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRiskCycleSnapshotUseCase {
	return &ListRiskCycleSnapshotUseCase{
		riskRepo: riskRepo,
	}
}

type ListRiskCycleSnapshotInput struct {
	Cycle  string
	OrgIDs []uuid.UUID
}

func (uc *ListRiskCycleSnapshotUseCase) Execute(ctx context.Context, input ListRiskCycleSnapshotInput) ([]*entity.Risk, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}

	items, err := uc.riskRepo.ListCycleSnapshot(ctx, input.Cycle, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk cycle snapshot")
	}

	return items, nil
}
