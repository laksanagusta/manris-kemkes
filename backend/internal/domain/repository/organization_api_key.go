package repository

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type OrganizationAPIKeyRepository interface {
	Get(ctx context.Context, orgID uuid.UUID) (*entity.OrganizationAPIKey, error)
	// A nil expectedID creates a key; otherwise atomically replaces that revision.
	Save(ctx context.Context, key *entity.OrganizationAPIKey, actorID uuid.UUID, expectedID *uuid.UUID) error
	// Authentication and the shared 60/minute quota are consumed atomically.
	AuthenticateAndConsume(ctx context.Context, hash string) (*entity.APIKeyAdmission, error)
}
