package organization

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateOrganizationUseCase struct {
	orgRepo repository.OrganizationRepository
}

func NewUpdateOrganizationUseCase(
	orgRepo repository.OrganizationRepository,
) *UpdateOrganizationUseCase {
	return &UpdateOrganizationUseCase{
		orgRepo: orgRepo,
	}
}

type UpdateOrganizationInput struct {
	ID       uuid.UUID
	Name     string
	ParentID *uuid.UUID
}

type UpdateOrganizationOutput struct {
	ID       uuid.UUID
	Name     string
	ParentID *uuid.UUID
	Message  string
}

func (uc *UpdateOrganizationUseCase) Execute(ctx context.Context, input UpdateOrganizationInput) (*UpdateOrganizationOutput, error) {
	existingOrg, err := uc.orgRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if input.ParentID != nil {
		if *input.ParentID == input.ID {
			return nil, errors.Wrap(errors.ErrInvalidInput, "organization cannot be its own parent")
		}

		_, err := uc.orgRepo.GetByID(ctx, *input.ParentID)
		if err != nil {
			return nil, errors.Wrap(err, "parent organization not found")
		}

		descendants, err := uc.orgRepo.GetDescendants(ctx, input.ID)
		if err != nil {
			return nil, errors.Wrap(err, "failed to check descendants")
		}

		for _, descID := range descendants {
			if descID == *input.ParentID {
				return nil, errors.Wrap(errors.ErrInvalidInput, "circular reference: cannot set a descendant as parent")
			}
		}
	}

	existingOrg.Name = input.Name
	existingOrg.ParentID = input.ParentID

	if err := existingOrg.Validate(); err != nil {
		return nil, err
	}

	if err := uc.orgRepo.Update(ctx, existingOrg); err != nil {
		return nil, errors.Wrap(err, "failed to update organization")
	}

	return &UpdateOrganizationOutput{
		ID:       existingOrg.ID,
		Name:     existingOrg.Name,
		ParentID: existingOrg.ParentID,
		Message:  "Organization updated successfully",
	}, nil
}
