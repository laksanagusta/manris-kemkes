package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateUseCase struct {
	groupRepo repository.OrganizationGroupRepository
	orgRepo   repository.OrganizationRepository
}

func NewCreateUseCase(groupRepo repository.OrganizationGroupRepository, orgRepo repository.OrganizationRepository) *CreateUseCase {
	return &CreateUseCase{groupRepo: groupRepo, orgRepo: orgRepo}
}

type CreateInput struct {
	OwnerOrganizationID   uuid.UUID   `json:"ownerOrganizationId"`
	Name                  string      `json:"name"`
	Description           string      `json:"description"`
	MemberOrganizationIDs []uuid.UUID `json:"memberOrganizationIds"`
	Scope                 *entity.AccessScope
}

func (uc *CreateUseCase) Execute(ctx context.Context, input CreateInput) (*entity.OrganizationGroup, error) {
	if err := requireOwnOrganization(input.Scope, input.OwnerOrganizationID); err != nil {
		return nil, err
	}

	group := &entity.OrganizationGroup{
		OwnerOrganizationID: input.OwnerOrganizationID,
		Name:                input.Name,
		Description:         input.Description,
	}
	if input.Scope != nil {
		group.CreatedBy = &input.Scope.UserID
	}
	if err := group.Validate(); err != nil {
		return nil, err
	}

	if err := validateGroupMembers(ctx, uc.orgRepo, input.Scope, group.OwnerOrganizationID, input.MemberOrganizationIDs); err != nil {
		return nil, err
	}

	if err := uc.groupRepo.Create(ctx, group, input.MemberOrganizationIDs); err != nil {
		return nil, errors.Wrap(err, "failed to create organization group")
	}

	return group, nil
}
