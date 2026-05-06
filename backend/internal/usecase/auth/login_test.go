package auth

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainErrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

type loginStubUserRepo struct {
	user *entity.User
	err  error
}

func (s *loginStubUserRepo) Create(_ context.Context, _ *entity.User) error { return nil }
func (s *loginStubUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	return s.user, s.err
}
func (s *loginStubUserRepo) GetByUsername(_ context.Context, _ string) (*entity.User, error) {
	return s.user, s.err
}
func (s *loginStubUserRepo) GetByNIP(_ context.Context, _ string) (*entity.User, error) {
	return s.user, s.err
}
func (s *loginStubUserRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *loginStubUserRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *loginStubUserRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }
func (s *loginStubUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

func TestLoginExecuteReturnsInvalidCredentialsForUnknownUser(t *testing.T) {
	orgRepo := &stubOrgRepo{}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)
	uc := NewLoginUseCase(&loginStubUserRepo{err: pgx.ErrNoRows}, hierarchySvc, "secret", 24, true)

	_, err := uc.Execute(context.Background(), LoginInput{
		NIP:      "missing-user",
		Password: "TempPass123!",
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err != domainErrors.ErrInvalidCredentials {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestLoginExecuteReturnsTokenForActiveUser(t *testing.T) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	orgRepo := &stubOrgRepo{}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)
	uc := NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
		ID:           uuid.New(),
		Username:     "active-user",
		NIP:          "active-user",
		Name:         "Active User",
		Role:         entity.RoleSuperAdmin,
		Status:       entity.UserStatusActive,
		PasswordHash: string(passwordHash),
	}}, hierarchySvc, "secret", 24, true)

	result, err := uc.Execute(context.Background(), LoginInput{
		NIP:      "active-user",
		Password: "TempPass123!",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil || result.Token == "" {
		t.Fatal("expected auth token, got nil/empty token")
	}
	if result.SessionMode != entity.AuthSessionModeFull {
		t.Fatalf("expected session mode %q, got %q", entity.AuthSessionModeFull, result.SessionMode)
	}
	if result.MustChangePassword {
		t.Fatal("expected mustChangePassword to be false for active user")
	}
	if result.User == nil {
		t.Fatal("expected user payload")
	}
	if result.User.Status != entity.UserStatusActive {
		t.Fatalf("expected user status %q, got %q", entity.UserStatusActive, result.User.Status)
	}
	if result.User.MustChangePassword {
		t.Fatal("expected user mustChangePassword to be false for active user")
	}

	serialized, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal auth token: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(serialized, &payload); err != nil {
		t.Fatalf("unmarshal auth token json: %v", err)
	}
	userPayload, ok := payload["user"].(map[string]any)
	if !ok {
		t.Fatalf("expected user payload map, got %#v", payload["user"])
	}
	capabilities, ok := userPayload["capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested capabilities payload, got %#v", userPayload["capabilities"])
	}
	riskApprovalWorkflowEnabled, ok := capabilities["riskApprovalWorkflowEnabled"].(bool)
	if !ok {
		t.Fatalf("expected boolean riskApprovalWorkflowEnabled, got %#v", capabilities["riskApprovalWorkflowEnabled"])
	}
	if !riskApprovalWorkflowEnabled {
		t.Fatal("expected riskApprovalWorkflowEnabled to be true")
	}

	claims := &middleware.JWTClaims{}
	parsedToken, err := jwt.ParseWithClaims(result.Token, claims, func(token *jwt.Token) (any, error) {
		return []byte("secret"), nil
	})
	if err != nil {
		t.Fatalf("parse jwt claims: %v", err)
	}
	if !parsedToken.Valid {
		t.Fatal("expected generated token to be valid")
	}
	if claims.SetupOnly {
		t.Fatal("expected active-user token to be full-session, got setupOnly=true")
	}
}

func TestLoginExecuteRejectsPendingActivationUser(t *testing.T) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	orgRepo := &stubOrgRepo{}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)
	uc := NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
		ID:                 uuid.New(),
		Username:           "pending-user",
		NIP:                "pending-user",
		Name:               "Pending User",
		Role:               entity.RoleSuperAdmin,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: true,
		PasswordHash:       string(passwordHash),
	}}, hierarchySvc, "secret", 24, true)

	_, err = uc.Execute(context.Background(), LoginInput{
		NIP:      "pending-user",
		Password: "TempPass123!",
	})
	if err != nil {
		if err != domainErrors.ErrAccountPendingApproval {
			t.Fatalf("expected ErrAccountPendingApproval, got %v", err)
		}
		return
	}
	t.Fatal("expected error, got nil")
}

func TestLoginExecuteRejectsInactiveUser(t *testing.T) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	orgRepo := &stubOrgRepo{}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)
	uc := NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
		ID:           uuid.New(),
		Username:     "inactive-user",
		NIP:          "inactive-user",
		Name:         "Inactive User",
		Role:         entity.RoleUnit,
		Status:       entity.UserStatusInactive,
		PasswordHash: string(passwordHash),
	}}, hierarchySvc, "secret", 24, true)

	_, err = uc.Execute(context.Background(), LoginInput{
		NIP:      "inactive-user",
		Password: "TempPass123!",
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err != domainErrors.ErrAccountInactive {
		t.Fatalf("expected ErrAccountInactive, got %v", err)
	}
}

func TestLoginExecuteReturnsFullSessionForActiveUserEvenIfPasswordChangeRequired(t *testing.T) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	orgRepo := &stubOrgRepo{}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)
	uc := NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
		ID:                 uuid.New(),
		Username:           "active-reset-user",
		NIP:                "active-reset-user",
		Name:               "Active Reset User",
		Role:               entity.RoleSuperAdmin,
		Status:             entity.UserStatusActive,
		MustChangePassword: true,
		PasswordHash:       string(passwordHash),
	}}, hierarchySvc, "secret", 24, false)

	result, err := uc.Execute(context.Background(), LoginInput{
		NIP:      "active-reset-user",
		Password: "TempPass123!",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.SessionMode != entity.AuthSessionModeFull {
		t.Fatalf("expected session mode %q, got %q", entity.AuthSessionModeFull, result.SessionMode)
	}
	if result.User == nil {
		t.Fatal("expected user payload")
	}
	if result.User.Status != entity.UserStatusActive {
		t.Fatalf("expected user status %q, got %q", entity.UserStatusActive, result.User.Status)
	}
	claims := &middleware.JWTClaims{}
	parsedToken, err := jwt.ParseWithClaims(result.Token, claims, func(token *jwt.Token) (any, error) {
		return []byte("secret"), nil
	})
	if err != nil {
		t.Fatalf("parse jwt claims: %v", err)
	}
	if !parsedToken.Valid {
		t.Fatal("expected generated token to be valid")
	}
	if claims.SetupOnly {
		t.Fatal("expected active-user token to remain full-session even with mustChangePassword=true")
	}

	serialized, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal auth token: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(serialized, &payload); err != nil {
		t.Fatalf("unmarshal auth token json: %v", err)
	}
	userPayload, ok := payload["user"].(map[string]any)
	if !ok {
		t.Fatalf("expected user payload map, got %#v", payload["user"])
	}
	capabilities, ok := userPayload["capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested capabilities payload, got %#v", userPayload["capabilities"])
	}
	riskApprovalWorkflowEnabled, ok := capabilities["riskApprovalWorkflowEnabled"].(bool)
	if !ok {
		t.Fatalf("expected boolean riskApprovalWorkflowEnabled, got %#v", capabilities["riskApprovalWorkflowEnabled"])
	}
	if riskApprovalWorkflowEnabled {
		t.Fatal("expected riskApprovalWorkflowEnabled to be false")
	}
}
