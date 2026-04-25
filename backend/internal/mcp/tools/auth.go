package tools

import (
	"context"
	"errors"
	"time"

	"github.com/manris/backend/internal/domain/entity"
	authuc "github.com/manris/backend/internal/usecase/auth"
	"github.com/manris/backend/internal/mcp/session"
)

var (
	ErrMissingCredentials = errors.New("email and password required")
	ErrUserNotFound       = errors.New("user not found")
)

type AuthLoginUseCaseI interface {
	Execute(ctx context.Context, input authuc.LoginInput) (*entity.AuthToken, error)
}

type Deps struct {
	AuthLoginUC    AuthLoginUseCaseI
	SessionManager *session.Manager
}

func HandleLogin(ctx context.Context, deps Deps, email, password string) (map[string]interface{}, error) {
	if email == "" || password == "" {
		return nil, ErrMissingCredentials
	}

	result, err := deps.AuthLoginUC.Execute(ctx, authuc.LoginInput{
		Username: email,
		Password: password,
	})
	if err != nil {
		return nil, err
	}

	if result.User == nil {
		return nil, ErrUserNotFound
	}

	expiryTime := time.Now().Add(24 * time.Hour)

	sessionData := &session.Session{
		UserID:           result.User.ID,
		Username:         result.User.Username,
		Name:             result.User.Name,
		Role:             result.User.Role,
		AccessibleOrgIDs: result.User.AccessibleOrgIDs,
		ExpiresAt:        expiryTime,
	}

	deps.SessionManager.Set(sessionData)

	orgIDStr := ""
	if result.User.OrganizationID != nil {
		orgIDStr = result.User.OrganizationID.String()
	}

	orgIDStrs := make([]string, len(result.User.AccessibleOrgIDs))
	for i, id := range result.User.AccessibleOrgIDs {
		orgIDStrs[i] = id.String()
	}

	output := map[string]interface{}{
		"user_id":              result.User.ID.String(),
		"username":             result.User.Username,
		"name":                 result.User.Name,
		"email":                result.User.Email,
		"role":                 result.User.Role,
		"organization_id":      orgIDStr,
		"accessible_org_ids":   orgIDStrs,
		"is_global":            result.User.IsGlobal,
		"session_expires_at":   expiryTime.Format(time.RFC3339),
		"must_change_password": result.User.MustChangePassword,
	}

	return output, nil
}
