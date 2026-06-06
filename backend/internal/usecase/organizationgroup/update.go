package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateUseCase struct {
	groupRepo repository.OrganizationGroupRepository
	orgRepo   repository.OrganizationRepository
}

func NewUpdateUseCase(groupRepo repository.OrganizationGroupRepository, orgRepo repository.OrganizationRepository) *UpdateUseCase {
	return &UpdateUseCase{groupRepo: groupRepo, orgRepo: orgRepo}
}

type UpdateInput struct {
	ID                    uuid.UUID   `json:"-"`
	OwnerOrganizationID   uuid.UUID   `json:"ownerOrganizationId"`
	Name                  string      `json:"name"`
	Description           string      `json:"description"`
	MemberOrganizationIDs []uuid.UUID `json:"memberOrganizationIds"`
	Scope                 *entity.AccessScope
}

func (uc *UpdateUseCase) Execute(ctx context.Context, input UpdateInput) (*entity.OrganizationGroup, error) {
	existing, err := uc.groupRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if err := requireOwnOrganization(input.Scope, existing.OwnerOrganizationID); err != nil {
		return nil, err
	}

	if input.OwnerOrganizationID != uuid.Nil && input.OwnerOrganizationID != existing.OwnerOrganizationID {
		if input.Scope == nil || !input.Scope.IsGlobal {
			return nil, errors.ErrForbidden
		}
	}

	group := &entity.OrganizationGroup{
		ID:                  input.ID,
		OwnerOrganizationID: existing.OwnerOrganizationID,
		Name:                input.Name,
		Description:         input.Description,
		CreatedBy:           existing.CreatedBy,
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

	if err := uc.groupRepo.Update(ctx, group, input.MemberOrganizationIDs); err != nil {
		return nil, errors.Wrap(err, "failed to update organization group")
	}

	updated, err := uc.groupRepo.GetByID(ctx, group.ID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to reload organization group")
	}
	return updated, nil
}
