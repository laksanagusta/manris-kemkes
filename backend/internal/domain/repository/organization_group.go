package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type OrganizationGroupListFilter struct {
	OwnerOrganizationID *uuid.UUID
	GroupID             *uuid.UUID
	Q                   string
	SortBy              string
	SortOrder           string
	Page                int
	Limit               int
	IncludeMembers      bool
}

type OrganizationGroupOption struct {
	ID                    uuid.UUID `json:"id"`
	Name                  string    `json:"name"`
	OwnerOrganizationID   uuid.UUID `json:"ownerOrganizationId"`
	OwnerOrganizationName string    `json:"ownerOrganizationName"`
}

type OrganizationGroupRepository interface {
	Create(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error
	Update(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.OrganizationGroup, error)
	List(ctx context.Context, filter OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error)
	ListOptions(ctx context.Context, ownerID *uuid.UUID) ([]OrganizationGroupOption, error)
	ListMemberIDs(ctx context.Context, id uuid.UUID) ([]uuid.UUID, error)
}
