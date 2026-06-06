package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type OrganizationGroupListFilter struct {
	OwnerOrganizationID *uuid.UUID
	Q                   string
	Page                int
	Limit               int
	IncludeMembers      bool
}

type OrganizationGroupRepository interface {
	Create(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error
	Update(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.OrganizationGroup, error)
	List(ctx context.Context, filter OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error)
	ListMemberIDs(ctx context.Context, id uuid.UUID) ([]uuid.UUID, error)
}
