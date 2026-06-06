package http

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
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
