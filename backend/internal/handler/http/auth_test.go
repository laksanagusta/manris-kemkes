package http

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainErrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/service"
	authuc "github.com/manris/backend/internal/usecase/auth"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthHandlerLoginReturnsSetupSessionPayloadForPendingActivationUser(t *testing.T) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	handler := NewAuthHandler(
		authuc.NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
			ID:                 uuid.New(),
			Username:           "pending-user",
			Name:               "Pending User",
			Role:               entity.RoleSuperAdmin,
			Status:             entity.UserStatusPendingActivation,
			MustChangePassword: true,
			PasswordHash:       string(passwordHash),
		}}, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24),
		nil,
		nil,
	)

	body, err := json.Marshal(LoginRequest{
		Username: "pending-user",
		Password: "TempPass123!",
	})
	if err != nil {
		t.Fatalf("marshal login request: %v", err)
	}

	app := fiber.New()
	app.Post("/auth/login", handler.Login)

	req := httptest.NewRequest(fiber.MethodPost, "/auth/login", bytes.NewReader(body))
	req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}

	var payload struct {
		Data struct {
			Token              string `json:"token"`
			SessionMode        string `json:"sessionMode"`
			MustChangePassword bool   `json:"mustChangePassword"`
			User               struct {
				Status             string `json:"status"`
				MustChangePassword bool   `json:"mustChangePassword"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.Data.Token == "" {
		t.Fatal("expected token in response")
	}
	if payload.Data.SessionMode != entity.AuthSessionModeSetup {
		t.Fatalf("expected sessionMode %q, got %q", entity.AuthSessionModeSetup, payload.Data.SessionMode)
	}
	if !payload.Data.MustChangePassword {
		t.Fatal("expected mustChangePassword to be true")
	}
	if payload.Data.User.Status != entity.UserStatusPendingActivation {
		t.Fatalf("expected user.status %q, got %q", entity.UserStatusPendingActivation, payload.Data.User.Status)
	}
	if !payload.Data.User.MustChangePassword {
		t.Fatal("expected user.mustChangePassword to be true")
	}
}

func TestAuthHandlerChangePasswordReturnsFullSessionPayload(t *testing.T) {
	userID := uuid.New()
	tempHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	userRepo := &changePasswordHandlerUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "pending-user",
		Email:              "pending-user@manris.local",
		Name:               "Pending User",
		Role:               entity.RoleSuperAdmin,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: true,
		PasswordHash:       string(tempHash),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	handler := NewAuthHandler(
		nil,
		authuc.NewGetCurrentUserUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{})),
		authuc.NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24),
	)

	body, err := json.Marshal(map[string]string{
		"newPassword":     "N3wPassw0rd!2026",
		"confirmPassword": "N3wPassw0rd!2026",
	})
	if err != nil {
		t.Fatalf("marshal change-password request: %v", err)
	}

	app := fiber.New()
	app.Post("/auth/change-password", func(c *fiber.Ctx) error {
		c.Locals("userId", userID)
		return c.Next()
	}, handler.ChangePassword)

	req := httptest.NewRequest(fiber.MethodPost, "/auth/change-password", bytes.NewReader(body))
	req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}

	var payload struct {
		Data struct {
			Token              string `json:"token"`
			SessionMode        string `json:"sessionMode"`
			MustChangePassword bool   `json:"mustChangePassword"`
			User               struct {
				Status             string `json:"status"`
				MustChangePassword bool   `json:"mustChangePassword"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data.Token == "" {
		t.Fatal("expected token in response")
	}
	if payload.Data.SessionMode != entity.AuthSessionModeFull {
		t.Fatalf("expected sessionMode %q, got %q", entity.AuthSessionModeFull, payload.Data.SessionMode)
	}
	if payload.Data.MustChangePassword {
		t.Fatal("expected mustChangePassword to be false")
	}
	if payload.Data.User.Status != entity.UserStatusActive {
		t.Fatalf("expected user.status %q, got %q", entity.UserStatusActive, payload.Data.User.Status)
	}
	if payload.Data.User.MustChangePassword {
		t.Fatal("expected user.mustChangePassword to be false")
	}
}

func TestAuthHandlerChangePasswordRejectsMalformedInput(t *testing.T) {
	userID := uuid.New()
	tempHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	userRepo := &changePasswordHandlerUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "pending-user",
		Email:              "pending-user@manris.local",
		Name:               "Pending User",
		Role:               entity.RoleSuperAdmin,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: true,
		PasswordHash:       string(tempHash),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	handler := NewAuthHandler(
		nil,
		authuc.NewGetCurrentUserUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{})),
		authuc.NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24),
	)

	body, err := json.Marshal(map[string]string{
		"newPassword":     "N3wPassw0rd!2026",
		"confirmPassword": "does-not-match",
	})
	if err != nil {
		t.Fatalf("marshal change-password request: %v", err)
	}

	app := fiber.New()
	app.Post("/auth/change-password", func(c *fiber.Ctx) error {
		c.Locals("userId", userID)
		return c.Next()
	}, handler.ChangePassword)

	req := httptest.NewRequest(fiber.MethodPost, "/auth/change-password", bytes.NewReader(body))
	req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusUnprocessableEntity {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 422, got %d: %s", resp.StatusCode, payload)
	}
	if userRepo.updatedUser != nil {
		t.Fatal("expected repository update not to run on invalid request")
	}
}

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
func (s *loginStubUserRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *loginStubUserRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *loginStubUserRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }

type changePasswordHandlerUserRepo struct {
	user        *entity.User
	updatedUser *entity.User
	updateErr   error
}

func (s *changePasswordHandlerUserRepo) Create(_ context.Context, _ *entity.User) error { return nil }

func (s *changePasswordHandlerUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	if s.user == nil {
		return nil, domainErrors.ErrNotFound
	}
	userCopy := *s.user
	return &userCopy, nil
}

func (s *changePasswordHandlerUserRepo) GetByUsername(_ context.Context, username string) (*entity.User, error) {
	if s.user == nil {
		return nil, domainErrors.ErrNotFound
	}
	if username != s.user.Username && username != s.user.Email {
		return nil, domainErrors.ErrNotFound
	}
	userCopy := *s.user
	return &userCopy, nil
}

func (s *changePasswordHandlerUserRepo) Update(_ context.Context, user *entity.User) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	updatedCopy := *user
	s.updatedUser = &updatedCopy
	s.user = &updatedCopy
	return nil
}

func (s *changePasswordHandlerUserRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }
func (s *changePasswordHandlerUserRepo) List(_ context.Context) ([]*entity.User, error) {
	return nil, nil
}

type stubOrgRepo struct {
	descendants []uuid.UUID
}

func (s *stubOrgRepo) Create(_ context.Context, _ *entity.Organization) error { return nil }
func (s *stubOrgRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.Organization, error) {
	return nil, nil
}
func (s *stubOrgRepo) Update(_ context.Context, _ *entity.Organization) error { return nil }
func (s *stubOrgRepo) Delete(_ context.Context, _ uuid.UUID) error            { return nil }
func (s *stubOrgRepo) List(_ context.Context) ([]*entity.Organization, error) { return nil, nil }
func (s *stubOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return s.descendants, nil
}
