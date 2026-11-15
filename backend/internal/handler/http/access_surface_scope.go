package http

import (
	"strings"

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

func resolveWritableOrganization(scope *entity.AccessScope, requested *uuid.UUID) (*uuid.UUID, error) {
	if scope == nil {
		return nil, domainerrors.ErrForbidden
	}
	if requested == nil && !scope.IsGlobal {
		requested = scope.OrganizationID
	}
	if !scope.IsGlobal && (requested == nil || *requested == uuid.Nil || !scope.CanWrite(*requested)) {
		return nil, domainerrors.ErrForbidden
	}
	return requested, nil
}

// resolveReadableOrgIDs includes every descendant supplied by the hierarchy.
// Mutation handlers must continue to use resolveOperationalOrgIDs.
func resolveReadableOrgIDs(scope *entity.AccessScope, rawOrgID string) ([]uuid.UUID, error) {
	if scope == nil {
		return nil, domainerrors.ErrForbidden
	}
	if rawOrgID != "" {
		return resolveReportOrgIDs(scope, rawOrgID)
	}
	if scope.IsGlobal {
		return []uuid.UUID{}, nil
	}
	if len(scope.AccessibleOrgIDs) == 0 {
		if scope.OrganizationID != nil && *scope.OrganizationID != uuid.Nil {
			return []uuid.UUID{*scope.OrganizationID}, nil
		}
		return nil, domainerrors.ErrForbidden
	}
	return append([]uuid.UUID(nil), scope.AccessibleOrgIDs...), nil
}

func resolveOperationalOrgIDs(scope *entity.AccessScope, rawOrgID string) ([]uuid.UUID, error) {
	if scope == nil || scope.IsGlobal {
		if rawOrgID == "" {
			return []uuid.UUID{}, nil
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
	normalizeAndParse := func(raw string) ([]uuid.UUID, error) {
		parts := strings.Split(raw, ",")
		parsedIDs := make([]uuid.UUID, 0, len(parts))
		seen := make(map[uuid.UUID]struct{}, len(parts))

		for _, part := range parts {
			value := strings.TrimSpace(part)
			if value == "" {
				continue
			}
			orgID, err := uuid.Parse(value)
			if err != nil {
				return nil, err
			}
			if _, exists := seen[orgID]; exists {
				continue
			}
			seen[orgID] = struct{}{}
			parsedIDs = append(parsedIDs, orgID)
		}

		// An explicitly supplied filter must never become the empty-slice
		// sentinel, which repositories interpret as an unrestricted query.
		if len(parsedIDs) == 0 {
			return nil, domainerrors.ErrInvalidInput
		}

		return parsedIDs, nil
	}

	if scope == nil || scope.IsGlobal {
		if rawOrgID == "" {
			return []uuid.UUID{}, nil
		}
		parsed, err := normalizeAndParse(rawOrgID)
		if err != nil {
			return nil, err
		}
		return parsed, nil
	}

	ownOrgID, err := resolveOwnOrgID(scope)
	if err != nil {
		return nil, err
	}

	if rawOrgID == "" {
		return []uuid.UUID{ownOrgID}, nil
	}

	parsed, err := normalizeAndParse(rawOrgID)
	if err != nil {
		return nil, err
	}

	narrowed := make([]uuid.UUID, 0, len(parsed))
	seen := make(map[uuid.UUID]struct{}, len(parsed))
	for _, orgID := range parsed {
		resolved, err := scope.NarrowToOrg(orgID)
		if err != nil {
			return nil, err
		}
		for _, id := range resolved {
			if _, exists := seen[id]; exists {
				continue
			}
			seen[id] = struct{}{}
			narrowed = append(narrowed, id)
		}
	}

	return narrowed, nil
}
