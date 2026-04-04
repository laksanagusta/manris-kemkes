package organization

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateOrganizationUseCase struct {
	orgRepo repository.OrganizationRepository
}

func NewCreateOrganizationUseCase(
	orgRepo repository.OrganizationRepository,
) *CreateOrganizationUseCase {
	return &CreateOrganizationUseCase{
		orgRepo: orgRepo,
	}
}

type CreateOrganizationInput struct {
	Name     string
	ParentID *uuid.UUID
}

type CreateOrganizationOutput struct {
	ID        uuid.UUID
	Name      string
	ParentID  *uuid.UUID
	Message   string
	CreatedAt time.Time
}

func (uc *CreateOrganizationUseCase) Execute(ctx context.Context, input CreateOrganizationInput) (*CreateOrganizationOutput, error) {
	if input.Name == "" {
		return nil, errors.ErrInvalidName
	}

	if input.ParentID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.ParentID)
		if err != nil {
			return nil, errors.Wrap(err, "parent organization not found")
		}
	}

	org := &entity.Organization{
		Name:     input.Name,
		ParentID: input.ParentID,
	}

	if err := org.Validate(); err != nil {
		return nil, err
	}

	if err := uc.orgRepo.Create(ctx, org); err != nil {
		return nil, errors.Wrap(err, "failed to create organization")
	}

	return &CreateOrganizationOutput{
		ID:        org.ID,
		Name:      org.Name,
		ParentID:  org.ParentID,
		Message:   "Organization created successfully",
		CreatedAt: org.CreatedAt,
	}, nil
}
