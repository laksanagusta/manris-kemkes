package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewGetUseCase(groupRepo repository.OrganizationGroupRepository) *GetUseCase {
	return &GetUseCase{groupRepo: groupRepo}
}

type GetInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *GetUseCase) Execute(ctx context.Context, input GetInput) (*entity.OrganizationGroup, error) {
	group, err := uc.groupRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if err := requireOwnOrganization(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}
	return group, nil
}
