package organization

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// DeleteOrganizationUseCase handles organization deletion business logic
type DeleteOrganizationUseCase struct {
	orgRepo repository.OrganizationRepository
}

func NewDeleteOrganizationUseCase(
	orgRepo repository.OrganizationRepository,
) *DeleteOrganizationUseCase {
	return &DeleteOrganizationUseCase{
		orgRepo: orgRepo,
	}
}

type DeleteOrganizationOutput struct {
	Message string
}

func (uc *DeleteOrganizationUseCase) Execute(ctx context.Context, id uuid.UUID) (*DeleteOrganizationOutput, error) {
	// 1. Get existing organization to check if it exists
	_, err := uc.orgRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	// 2. Check if organization has children (descendants other than itself)
	descendants, err := uc.orgRepo.GetDescendants(ctx, id)
	if err != nil {
		return nil, errors.Wrap(err, "failed to check descendants")
	}

	// If there are more than 1 descendant (including itself), it has children
	if len(descendants) > 1 {
		return nil, errors.ErrOrganizationHasChildren
	}

	// 3. Delete from database
	if err := uc.orgRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteOrganizationOutput{
		Message: "Organization deleted successfully",
	}, nil
}
