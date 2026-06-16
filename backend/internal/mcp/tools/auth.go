package tools

import (
	"context"
	"errors"
	"time"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/session"
	authuc "github.com/manris/backend/internal/usecase/auth"
)

var (
	ErrMissingCredentials = errors.New("nip dan kata sandi diperlukan")
	ErrUserNotFound       = errors.New("pengguna tidak ditemukan")
)

type AuthLoginUseCaseI interface {
	Execute(ctx context.Context, input authuc.LoginInput) (*entity.AuthToken, error)
}

type Deps struct {
	AuthLoginUC    AuthLoginUseCaseI
	SessionManager *session.Manager
	// SessionTTL controls how long an MCP session remains valid before
	// requiring a fresh login. Falls back to 24h when zero.
	SessionTTL time.Duration
}

func HandleLogin(ctx context.Context, deps Deps, nip, password string) (map[string]interface{}, error) {
	if nip == "" || password == "" {
		return nil, ErrMissingCredentials
	}

	result, err := deps.AuthLoginUC.Execute(ctx, authuc.LoginInput{
		NIP:      nip,
		Password: password,
	})
	if err != nil {
		return nil, err
	}

	if result == nil {
		return nil, errors.New("gagal masuk: tidak ada hasil")
	}

	if result.User == nil {
		return nil, ErrUserNotFound
	}

	ttl := deps.SessionTTL
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	expiryTime := time.Now().Add(ttl)

	sessionData := &session.Session{
		UserID:           result.User.ID,
		Username:         result.User.NIP,
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
		"nip":                  result.User.NIP,
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
