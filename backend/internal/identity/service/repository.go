package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/identity/domain"
)

// Store is the persistence boundary for application credentials and revocable sessions.
type Store interface {
	Application(context.Context, string) (*domain.Application, error)
	ApplicationByKey(context.Context, string) (*domain.Application, error)
	CreateApplication(context.Context, *domain.Application, uuid.UUID) error
	ListApplications(context.Context) ([]*domain.Application, error)
	RotateKey(context.Context, string, string, uuid.UUID) error
	DisableApplication(context.Context, string, uuid.UUID) error
	CreateSession(context.Context, *domain.Session) error
	Session(context.Context, uuid.UUID) (*domain.Session, error)
	RevokeSession(context.Context, uuid.UUID) error
}

// Directory owns the canonical shared profile, role, and organization membership.
type Directory interface {
	GetByID(context.Context, uuid.UUID) (*domain.User, error)
	GetByNIP(context.Context, string) (*domain.User, error)
	RecordLastLogin(context.Context, uuid.UUID) error
	UpdateProfile(context.Context, uuid.UUID, domain.ProfileUpdate) error
	ChangePassword(context.Context, uuid.UUID, string, string) error
}
type Organizations interface {
	List(context.Context) ([]*domain.Organization, error)
	GetByID(context.Context, uuid.UUID) (*domain.Organization, error)
	GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error)
}

// Validator allows consumers to use either the embedded service or its HTTP client.
type Validator interface {
	Validate(context.Context, string, string) (*domain.Identity, error)
}
