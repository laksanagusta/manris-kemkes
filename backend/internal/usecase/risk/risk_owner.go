package risk

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

func resolveRiskOwner(ctx context.Context, users repository.UserRepository, requested *string, orgID, currentID *uuid.UUID) (*uuid.UUID, error) {
	if requested == nil {
		return currentID, nil
	}
	if strings.TrimSpace(*requested) == "" {
		return nil, nil
	}
	id, err := uuid.Parse(*requested)
	if err != nil || orgID == nil {
		return nil, errors.ErrRiskOwnerInvalid
	}
	if currentID != nil && id == *currentID {
		return currentID, nil
	}
	user, err := users.GetByID(ctx, id)
	if err != nil || user == nil || user.Status != entity.UserStatusActive || !uuidPtrEqual(user.OrganizationID, orgID) {
		return nil, errors.ErrRiskOwnerInvalid
	}
	return &id, nil
}
