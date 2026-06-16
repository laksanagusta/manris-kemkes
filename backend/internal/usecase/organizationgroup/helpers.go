package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

func normalizePageLimit(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	return page, limit
}

func requireOwnOrganization(scope *entity.AccessScope, ownerID uuid.UUID) error {
	if scope == nil {
		return errors.ErrForbidden
	}
	if scope.IsGlobal {
		return nil
	}
	if scope.OrganizationID == nil || *scope.OrganizationID != ownerID {
		return errors.ErrForbidden
	}
	return nil
}

func loadOwnerDescendants(ctx context.Context, orgRepo repository.OrganizationRepository, ownerID uuid.UUID) (map[uuid.UUID]struct{}, error) {
	descendants, err := orgRepo.GetDescendants(ctx, ownerID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load owner descendants")
	}

	result := make(map[uuid.UUID]struct{}, len(descendants))
	for _, id := range descendants {
		result[id] = struct{}{}
	}
	return result, nil
}

func validateGroupMembers(ctx context.Context, orgRepo repository.OrganizationRepository, scope *entity.AccessScope, ownerID uuid.UUID, memberIDs []uuid.UUID) error {
	descendants, err := loadOwnerDescendants(ctx, orgRepo, ownerID)
	if err != nil {
		return err
	}

	for _, memberID := range memberIDs {
		if memberID == uuid.Nil {
			return errors.ErrMemberOrgIDRequired
		}
		if memberID == ownerID {
			return errors.ErrOwnerOrgNotGroupMember
		}
		if _, ok := descendants[memberID]; !ok {
			return errors.ErrMemberOrgMustBeDescendant
		}
		if scope != nil && !scope.CanRead(memberID) {
			return errors.ErrForbidden
		}
	}
	return nil
}
