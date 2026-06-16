package organization

import (
	"context"
	"strings"

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
	ID       uuid.UUID  `json:"-"`
	Name     string     `json:"name"`
	ParentID *uuid.UUID `json:"parentId"`
	Location string     `json:"location"`
	Address  string     `json:"address"`
}

type UpdateOrganizationOutput struct {
	ID       uuid.UUID  `json:"id"`
	Name     string     `json:"name"`
	ParentID *uuid.UUID `json:"parentId,omitempty"`
	Message  string     `json:"message"`
}

func (uc *UpdateOrganizationUseCase) Execute(ctx context.Context, input UpdateOrganizationInput) (*UpdateOrganizationOutput, error) {
	existingOrg, err := uc.orgRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if input.ParentID != nil {
		if *input.ParentID == input.ID {
			return nil, errors.ErrOrganizationCannotBeOwnParent
		}

		_, err := uc.orgRepo.GetByID(ctx, *input.ParentID)
		if err != nil {
			return nil, errors.ErrParentOrganizationNotFound
		}

		descendants, err := uc.orgRepo.GetDescendants(ctx, input.ID)
		if err != nil {
			return nil, errors.Wrap(err, "failed to check descendants")
		}

		for _, descID := range descendants {
			if descID == *input.ParentID {
				return nil, errors.ErrCircularReference
			}
		}
	}

	existingOrg.Name = input.Name
	existingOrg.ParentID = input.ParentID
	existingOrg.Location = strings.TrimSpace(input.Location)
	existingOrg.Address = strings.TrimSpace(input.Address)

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
