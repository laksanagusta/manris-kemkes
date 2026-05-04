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
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	authuc "github.com/manris/backend/internal/usecase/auth"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthHandlerLoginRejectsPendingActivationUser(t *testing.T) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	handler := NewAuthHandler(
		authuc.NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
			ID:                 uuid.New(),
			Username:           "pending-user",
			Name:               "Pending User",
			Email:              "pending-user@manris.local",
			Role:               entity.RoleSuperAdmin,
			Status:             entity.UserStatusPendingActivation,
			MustChangePassword: true,
			PasswordHash:       string(passwordHash),
			NIP:                "19880101",
			Jabatan:            "Koordinator",
			Pangkat:            "III/c",
		}}, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24, true),
		nil,
		nil,
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

	if resp.StatusCode != fiber.StatusForbidden {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 403, got %d: %s", resp.StatusCode, payload)
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
		nil,
		authuc.NewGetCurrentUserUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), false),
		nil,
		authuc.NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24, false),
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
				Capabilities       struct {
					RiskApprovalWorkflowEnabled bool `json:"riskApprovalWorkflowEnabled"`
				} `json:"capabilities"`
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
	if payload.Data.User.Capabilities.RiskApprovalWorkflowEnabled {
		t.Fatal("expected user.capabilities.riskApprovalWorkflowEnabled to be false")
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
		nil,
		authuc.NewGetCurrentUserUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), false),
		nil,
		authuc.NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24, false),
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

func TestAuthHandlerChangePasswordAllowsActiveUserWithCurrentPassword(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	currentHash, err := bcrypt.GenerateFromPassword([]byte("OldPass123!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	userRepo := &changePasswordHandlerUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "active-user",
		Email:              "active-user@manris.local",
		Name:               "Active User",
		Role:               entity.RoleUnit,
		OrganizationID:     &orgID,
		Status:             entity.UserStatusActive,
		MustChangePassword: false,
		PasswordHash:       string(currentHash),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	handler := NewAuthHandler(
		nil,
		nil,
		authuc.NewGetCurrentUserUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), false),
		nil,
		authuc.NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24, false),
	)

	body, err := json.Marshal(map[string]string{
		"currentPassword": "OldPass123!",
		"newPassword":     "NewPass123!",
		"confirmPassword": "NewPass123!",
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
}

func TestAuthHandlerUpdateProfileReturnsUpdatedProfile(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	userRepo := &changePasswordHandlerUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "active-user",
		Email:              "active-user@manris.local",
		Name:               "Active User",
		Role:               entity.RoleUnit,
		OrganizationID:     &orgID,
		OrgName:            "Direktorat A",
		Status:             entity.UserStatusActive,
		MustChangePassword: false,
		PasswordHash:       "hash",
		NIP:                "123",
		Jabatan:            "Analis",
		Pangkat:            "III/a",
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	hierarchySvc := service.NewOrganizationHierarchy(&stubOrgRepo{descendants: []uuid.UUID{orgID}})
	handler := NewAuthHandler(
		nil,
		nil,
		authuc.NewGetCurrentUserUseCase(userRepo, hierarchySvc, false),
		authuc.NewUpdateProfileUseCase(userRepo, hierarchySvc, false),
		nil,
	)

	body, err := json.Marshal(map[string]string{
		"name":     "Updated User",
		"username": "updated-user",
		"email":    "updated@manris.local",
		"nip":      "456",
		"jabatan":  "Koordinator",
		"pangkat":  "III/b",
	})
	if err != nil {
		t.Fatalf("marshal update-profile request: %v", err)
	}

	app := fiber.New()
	app.Put("/auth/me", func(c *fiber.Ctx) error {
		c.Locals("userId", userID)
		return c.Next()
	}, handler.UpdateProfile)

	req := httptest.NewRequest(fiber.MethodPut, "/auth/me", bytes.NewReader(body))
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
			Email   string `json:"email"`
			OrgName string `json:"orgName"`
			NIP     string `json:"nip"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data.Email != "updated@manris.local" {
		t.Fatalf("expected updated email, got %q", payload.Data.Email)
	}
	if payload.Data.OrgName != "Direktorat A" {
		t.Fatalf("expected orgName to be preserved, got %q", payload.Data.OrgName)
	}
	if payload.Data.NIP != "456" {
		t.Fatalf("expected updated NIP, got %q", payload.Data.NIP)
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
func (s *loginStubUserRepo) GetByNIP(_ context.Context, _ string) (*entity.User, error) {
	return s.user, s.err
}
func (s *loginStubUserRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *loginStubUserRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *loginStubUserRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }
func (s *loginStubUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

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
func (s *changePasswordHandlerUserRepo) GetByNIP(_ context.Context, nip string) (*entity.User, error) {
	if s.user == nil {
		return nil, domainErrors.ErrNotFound
	}
	if nip != s.user.NIP {
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
func (s *changePasswordHandlerUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
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
func (s *stubOrgRepo) ListWithFilter(_ context.Context, _ repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (s *stubOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return s.descendants, nil
}
func (s *stubOrgRepo) GetContext(_ context.Context, _ uuid.UUID) (string, error) {
	return "", nil
}
