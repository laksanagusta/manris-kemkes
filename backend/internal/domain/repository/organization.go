package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// OrganizationListFilter holds filter/pagination parameters for listing organizations
type OrganizationListFilter struct {
	Page  int
	Limit int
	Q     string // search query (name)
}

// OrganizationRepository defines the interface for organization data access
type OrganizationRepository interface {
	Create(ctx context.Context, org *entity.Organization) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error)
	Update(ctx context.Context, org *entity.Organization) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context) ([]*entity.Organization, error)
	ListWithFilter(ctx context.Context, filter OrganizationListFilter) ([]*entity.Organization, int, error)
	// GetDescendants returns all descendant organization IDs for a given organization (including itself)
	// This uses recursive CTE to traverse the organization hierarchy
	GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error)
}
