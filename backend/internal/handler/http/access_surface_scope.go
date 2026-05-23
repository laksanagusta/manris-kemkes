package http

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func resolveOwnOrgID(scope *entity.AccessScope) (uuid.UUID, error) {
	if scope == nil || scope.IsGlobal {
		return uuid.Nil, nil
	}
	if scope.OrganizationID == nil {
		return uuid.Nil, domainerrors.ErrForbidden
	}
	return *scope.OrganizationID, nil
}

func resolveOperationalOrgIDs(scope *entity.AccessScope, rawOrgID string) ([]uuid.UUID, error) {
	if scope == nil || scope.IsGlobal {
		if rawOrgID == "" {
			return nil, nil
		}
		parsed, err := uuid.Parse(rawOrgID)
		if err != nil {
			return nil, err
		}
		return []uuid.UUID{parsed}, nil
	}

	ownOrgID, err := resolveOwnOrgID(scope)
	if err != nil {
		return nil, err
	}

	if rawOrgID == "" {
		return []uuid.UUID{ownOrgID}, nil
	}

	parsed, err := uuid.Parse(rawOrgID)
	if err != nil {
		return nil, err
	}
	if parsed != ownOrgID {
		return nil, domainerrors.ErrForbidden
	}
	return []uuid.UUID{ownOrgID}, nil
}

func resolveReportOrgIDs(scope *entity.AccessScope, rawOrgID string) ([]uuid.UUID, error) {
	if scope == nil || scope.IsGlobal {
		if rawOrgID == "" {
			return nil, nil
		}
		parsed, err := uuid.Parse(rawOrgID)
		if err != nil {
			return nil, err
		}
		return []uuid.UUID{parsed}, nil
	}

	ownOrgID, err := resolveOwnOrgID(scope)
	if err != nil {
		return nil, err
	}

	if rawOrgID == "" {
		return []uuid.UUID{ownOrgID}, nil
	}

	parsed, err := uuid.Parse(rawOrgID)
	if err != nil {
		return nil, err
	}
	return scope.NarrowToOrg(parsed)
}
