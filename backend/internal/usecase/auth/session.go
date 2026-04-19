package auth

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/middleware"
)

func buildAuthToken(
	ctx context.Context,
	hierarchySvc *service.OrganizationHierarchy,
	jwtSecret string,
	jwtExpiry int,
	user *entity.User,
	sessionMode string,
	setupOnly bool,
) (*entity.AuthToken, error) {
	orgID := ""
	if user.OrganizationID != nil {
		orgID = user.OrganizationID.String()
	}

	token, err := middleware.GenerateToken(
		user.ID,
		user.Username,
		user.Role,
		orgID,
		setupOnly,
		jwtSecret,
		jwtExpiry,
	)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate token")
	}

	scope, err := hierarchySvc.ResolveAccessScope(ctx, user.ID, user.Role, user.OrganizationID)
	if err != nil {
		return nil, err
	}

	return &entity.AuthToken{
		Token:              token,
		SessionMode:        sessionMode,
		MustChangePassword: user.MustChangePassword,
		User: &entity.UserPublic{
			ID:                 user.ID,
			Username:           user.Username,
			Name:               user.Name,
			Role:               user.Role,
			OrganizationID:     user.OrganizationID,
			AccessibleOrgIDs:   scope.AccessibleOrgIDs,
			IsGlobal:           scope.IsGlobal,
			Status:             user.Status,
			MustChangePassword: user.MustChangePassword,
		},
	}, nil
}
