package organization

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetOrganizationUseCase struct {
	orgRepo repository.OrganizationRepository
}

func NewGetOrganizationUseCase(
	orgRepo repository.OrganizationRepository,
) *GetOrganizationUseCase {
	return &GetOrganizationUseCase{
		orgRepo: orgRepo,
	}
}

func (uc *GetOrganizationUseCase) Execute(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	org, err := uc.orgRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	return org, nil
}
