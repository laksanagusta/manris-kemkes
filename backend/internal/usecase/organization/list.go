package organization

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// ListOrganizationsUseCase handles listing all organizations
type ListOrganizationsUseCase struct {
	orgRepo repository.OrganizationRepository
}

// NewListOrganizationsUseCase creates a new list organizations use case
func NewListOrganizationsUseCase(orgRepo repository.OrganizationRepository) *ListOrganizationsUseCase {
	return &ListOrganizationsUseCase{
		orgRepo: orgRepo,
	}
}

// Execute retrieves all organizations
func (uc *ListOrganizationsUseCase) Execute(ctx context.Context) ([]*entity.Organization, error) {
	// Simply delegate to repository
	orgs, err := uc.orgRepo.List(ctx)
	if err != nil {
		return nil, err
	}

	return orgs, nil
}
