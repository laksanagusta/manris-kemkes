package tools

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/mcp/session"
	authuc "github.com/manris/backend/internal/usecase/auth"
)

type mockLoginUC struct {
	result *entity.AuthToken
	err    error
}

func (m *mockLoginUC) Execute(ctx context.Context, input authuc.LoginInput) (*entity.AuthToken, error) {
	return m.result, m.err
}

func TestHandleLogin_Success(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()

	mockUC := &mockLoginUC{
			result: &entity.AuthToken{
				Token:       "fake-jwt-token",
				SessionMode: entity.AuthSessionModeFull,
				User: &entity.UserPublic{
					ID:               userID,
					NIP:              "199001012020122001",
					Name:             "Test User",
					Email:            "test@example.com",
				Role:             "unit",
				OrganizationID:   &orgID,
				AccessibleOrgIDs: []uuid.UUID{orgID},
				IsGlobal:         false,
				Status:           "active",
			},
		},
	}

	deps := Deps{
		AuthLoginUC:    mockUC,
		SessionManager: &session.Manager{},
	}

	output, err := HandleLogin(context.Background(), deps, "199001012020122001", "password123")
	if err != nil {
		t.Fatalf("HandleLogin failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["user_id"] != userID.String() {
		t.Errorf("user_id mismatch")
	}

	if output["nip"] != "199001012020122001" {
		t.Errorf("nip mismatch")
	}

	if _, ok := output["session_expires_at"]; !ok {
		t.Errorf("session_expires_at not in output")
	}
}

func TestHandleLogin_MissingEmail(t *testing.T) {
	deps := Deps{
		AuthLoginUC:    &mockLoginUC{},
		SessionManager: &session.Manager{},
	}

	_, err := HandleLogin(context.Background(), deps, "", "password123")
	if err != ErrMissingCredentials {
		t.Errorf("expected ErrMissingCredentials, got %v", err)
	}
}

func TestHandleLogin_MissingPassword(t *testing.T) {
	deps := Deps{
		AuthLoginUC:    &mockLoginUC{},
		SessionManager: &session.Manager{},
	}

	_, err := HandleLogin(context.Background(), deps, "testuser", "")
	if err != ErrMissingCredentials {
		t.Errorf("expected ErrMissingCredentials, got %v", err)
	}
}

func TestHandleLogin_UseCaseError(t *testing.T) {
	mockUC := &mockLoginUC{
		err: domainerrors.ErrInvalidCredentials,
	}

	deps := Deps{
		AuthLoginUC:    mockUC,
		SessionManager: &session.Manager{},
	}

	_, err := HandleLogin(context.Background(), deps, "testuser", "wrongpassword")
	if err == nil {
		t.Fatalf("expected error from usecase")
	}
}

func TestHandleLogin_SessionSet(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()

	mockUC := &mockLoginUC{
			result: &entity.AuthToken{
				Token:       "fake-jwt",
				SessionMode: entity.AuthSessionModeFull,
				User: &entity.UserPublic{
					ID:               userID,
					NIP:              "199001012020122001",
					Name:             "Test User",
					Email:            "test@example.com",
				Role:             "admin",
				OrganizationID:   &orgID,
				AccessibleOrgIDs: []uuid.UUID{orgID},
				IsGlobal:         false,
				Status:           "active",
			},
		},
	}

	manager := &session.Manager{}
	deps := Deps{
		AuthLoginUC:    mockUC,
		SessionManager: manager,
	}

	_, err := HandleLogin(context.Background(), deps, "199001012020122001", "password")
	if err != nil {
		t.Fatalf("HandleLogin failed: %v", err)
	}

	retrievedSession, err := manager.Get()
	if err != nil {
		t.Fatalf("Session retrieval failed: %v", err)
	}

	if retrievedSession.UserID != userID {
		t.Errorf("Session UserID mismatch")
	}

	if retrievedSession.Username != "199001012020122001" {
		t.Errorf("Session Username mismatch")
	}

	if time.Now().After(retrievedSession.ExpiresAt) {
		t.Errorf("Session already expired")
	}
}
