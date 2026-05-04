package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// UserListFilter holds filter/pagination parameters for listing users
type UserListFilter struct {
	Page           int
	Limit          int
	Q              string // search query (name, username, email)
	Status         string // active, inactive, pending_activation
	Role           string // superadmin, unit, reviewer, pimpinan
	OrganizationID string
}

// UserRepository defines the interface for user data access
type UserRepository interface {
	Create(ctx context.Context, user *entity.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
	GetByUsername(ctx context.Context, username string) (*entity.User, error)
	GetByNIP(ctx context.Context, nip string) (*entity.User, error)
	Update(ctx context.Context, user *entity.User) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context) ([]*entity.User, error)
	ListWithFilter(ctx context.Context, filter UserListFilter) ([]*entity.User, int, error)
}
