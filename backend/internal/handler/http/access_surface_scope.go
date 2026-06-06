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
