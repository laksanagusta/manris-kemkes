package http

import (
	"context"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
)

type organizationGroupReportResolver interface {
	ResolveReportGroup(ctx context.Context, groupID uuid.UUID, scope *entity.AccessScope) ([]uuid.UUID, error)
}

func resolveReportOrgIDsFromQuery(
	ctx context.Context,
	scope *entity.AccessScope,
	rawOrgID string,
	rawGroupID string,
	groupResolver organizationGroupReportResolver,
) ([]uuid.UUID, error) {
	if rawOrgID != "" && rawGroupID != "" {
		return nil, domainerrors.ErrInvalidInput
	}

	if rawGroupID != "" {
		groupID, err := uuid.Parse(rawGroupID)
		if err != nil {
			return nil, err
		}
		if groupResolver == nil {
			return nil, domainerrors.ErrInternal
		}
		return groupResolver.ResolveReportGroup(ctx, groupID, scope)
	}

	if rawOrgID != "" {
		return resolveReportOrgIDs(scope, rawOrgID)
	}

	if scope != nil && !scope.IsGlobal {
		ownOrgID, err := resolveOwnOrgID(scope)
		if err != nil {
			return nil, err
		}
		return []uuid.UUID{ownOrgID}, nil
	}

	return []uuid.UUID{}, nil
}

func isGroupResolutionForbidden(err error) bool {
	return errors.Is(err, domainerrors.ErrForbidden)
}

func isGroupResolutionBadRequest(err error) bool {
	return errors.Is(err, domainerrors.ErrInvalidInput) || errors.Is(err, domainerrors.ErrNotFound)
}

func resolveRiskReportScope(c *fiber.Ctx, groups organizationGroupReportResolver) ([]uuid.UUID, error) {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return nil, domainerrors.ErrForbidden
	}
	// A blank comma-list must never become the unrestricted empty-ID sentinel.
	if raw := c.Query("org_id"); raw != "" && strings.Trim(raw, ", \t\r\n") == "" {
		return nil, domainerrors.ErrInvalidInput
	}
	ids, err := resolveReportOrgIDsFromQuery(c.Context(), scope, c.Query("org_id"), c.Query("organization_group_id"), groups)
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return nil, err
		}
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "filter organisasi tidak valid")
	}
	if c.Query("organization_group_id") != "" && len(ids) == 0 {
		return nil, domainerrors.ErrInvalidInput
	}
	if !scope.IsGlobal && len(ids) == 0 {
		return nil, domainerrors.ErrForbidden
	}
	if !scope.IsGlobal {
		for _, id := range ids {
			if !scope.CanRead(id) {
				return nil, domainerrors.ErrForbidden
			}
		}
	}
	return ids, nil
}
