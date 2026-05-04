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
	"github.com/manris/backend/internal/middleware"
	useruc "github.com/manris/backend/internal/usecase/user"
	"golang.org/x/crypto/bcrypt"
)

type handlerUserRepo struct {
	created     *entity.User
	updatedUser *entity.User
	deletedID   uuid.UUID
	byLookup    map[string]*entity.User
	byID        map[uuid.UUID]*entity.User
}

func (s *handlerUserRepo) Create(_ context.Context, user *entity.User) error {
	s.created = user
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = user.CreatedAt
	}
	return nil
}

func (s *handlerUserRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	if s.byID == nil {
		return nil, nil
	}
	if user, ok := s.byID[id]; ok {
		return user, nil
	}
	return nil, nil
}
func (s *handlerUserRepo) Update(_ context.Context, user *entity.User) error {
	copy := *user
	s.updatedUser = &copy
	if s.byID == nil {
		s.byID = map[uuid.UUID]*entity.User{}
	}
	s.byID[user.ID] = &copy
	return nil
}
func (s *handlerUserRepo) Delete(_ context.Context, id uuid.UUID) error {
	s.deletedID = id
	delete(s.byID, id)
	return nil
}
func (s *handlerUserRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }
func (s *handlerUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}
func (s *handlerUserRepo) GetByUsername(_ context.Context, username string) (*entity.User, error) {
	if s.byLookup == nil {
		return nil, nil
	}
	return s.byLookup[username], nil
}
func (s *handlerUserRepo) GetByNIP(_ context.Context, _ string) (*entity.User, error) {
	return nil, nil
}

type handlerOrgRepo struct {
	orgs map[uuid.UUID]*entity.Organization
}

func (s *handlerOrgRepo) Create(_ context.Context, _ *entity.Organization) error { return nil }
func (s *handlerOrgRepo) Update(_ context.Context, _ *entity.Organization) error { return nil }
func (s *handlerOrgRepo) Delete(_ context.Context, _ uuid.UUID) error            { return nil }
func (s *handlerOrgRepo) List(_ context.Context) ([]*entity.Organization, error) { return nil, nil }
func (s *handlerOrgRepo) ListWithFilter(_ context.Context, _ repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (s *handlerOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}

func (s *handlerOrgRepo) GetContext(_ context.Context, _ uuid.UUID) (string, error) {
	return "", nil
}

func (s *handlerOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	if org, ok := s.orgs[id]; ok {
		return org, nil
	}
	return nil, domainErrors.ErrNotFound
}

func TestUserHandlerCreateAcceptsPlainPassword(t *testing.T) {
	orgID := uuid.New()
	userRepo := &handlerUserRepo{}
	orgRepo := &handlerOrgRepo{orgs: map[uuid.UUID]*entity.Organization{
		orgID: {ID: orgID, Name: "Direktorat Surveilans"},
	}}
	createUC := useruc.NewCreateUserUseCase(userRepo, orgRepo)
	handler := NewUserHandler(createUC, nil, nil, nil, nil, nil, nil, nil)

	body, err := json.Marshal(map[string]any{
		"name":           "Unit Test User",
		"username":       "unit-test-user",
		"email":          "unit-test-user@manris.local",
		"password":       "TempPass123!",
		"role":           entity.RoleUnit,
		"organizationId": orgID.String(),
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	app := fiber.New()
	app.Post("/users", func(c *fiber.Ctx) error {
		c.Locals("role", entity.RoleSuperAdmin)
		return c.Next()
	}, middleware.RoleGuard(entity.RoleSuperAdmin), handler.CreateUser)

	req := httptest.NewRequest(fiber.MethodPost, "/users", bytes.NewReader(body))
	req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusCreated {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 201, got %d: %s", resp.StatusCode, payload)
	}
	if userRepo.created == nil {
		t.Fatal("expected create use case to persist a user")
	}
	if userRepo.created.PasswordHash == "TempPass123!" {
		t.Fatal("expected handler flow to store only password hash")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(userRepo.created.PasswordHash), []byte("TempPass123!")); err != nil {
		t.Fatalf("expected bcrypt hash to match password: %v", err)
	}
	if userRepo.created.Status != entity.UserStatusPendingActivation {
		t.Fatalf("expected status %q, got %q", entity.UserStatusPendingActivation, userRepo.created.Status)
	}
	if !userRepo.created.MustChangePassword {
		t.Fatal("expected must_change_password to be true")
	}
}

func TestUserHandlerApproveRegistrationActivatesPendingUser(t *testing.T) {
	userID := uuid.New()
	userRepo := &handlerUserRepo{
		byID: map[uuid.UUID]*entity.User{
			userID: {
				ID:                 userID,
				Status:             entity.UserStatusPendingActivation,
				MustChangePassword: false,
			},
		},
	}
	handler := NewUserHandler(nil, nil, nil, nil, nil, nil, useruc.NewApproveRegistrationUseCase(userRepo), nil)

	app := fiber.New()
	app.Post("/users/:id/approve-registration", func(c *fiber.Ctx) error {
		c.Locals("role", entity.RoleSuperAdmin)
		return c.Next()
	}, middleware.RoleGuard(entity.RoleSuperAdmin), handler.ApproveRegistration)

	req := httptest.NewRequest(fiber.MethodPost, "/users/"+userID.String()+"/approve-registration", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}
	if userRepo.updatedUser == nil || userRepo.updatedUser.Status != entity.UserStatusActive {
		t.Fatalf("expected pending user to be activated, got %#v", userRepo.updatedUser)
	}
}

func TestUserHandlerRejectRegistrationDeletesPendingUser(t *testing.T) {
	userID := uuid.New()
	userRepo := &handlerUserRepo{
		byID: map[uuid.UUID]*entity.User{
			userID: {
				ID:     userID,
				Status: entity.UserStatusPendingActivation,
			},
		},
	}
	handler := NewUserHandler(nil, nil, nil, nil, nil, nil, nil, useruc.NewRejectRegistrationUseCase(userRepo))

	app := fiber.New()
	app.Delete("/users/:id/reject-registration", func(c *fiber.Ctx) error {
		c.Locals("role", entity.RoleSuperAdmin)
		return c.Next()
	}, middleware.RoleGuard(entity.RoleSuperAdmin), handler.RejectRegistration)

	req := httptest.NewRequest(fiber.MethodDelete, "/users/"+userID.String()+"/reject-registration", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}
	if userRepo.deletedID != userID {
		t.Fatalf("expected delete for %s, got %s", userID, userRepo.deletedID)
	}
}

func TestUserRoutesRequireSuperadmin(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{name: "list users", method: fiber.MethodGet, path: "/users"},
		{name: "create user", method: fiber.MethodPost, path: "/users", body: `{"name":"User","username":"user","email":"user@manris.local","password":"TempPass123!","role":"unit"}`},
		{name: "get user", method: fiber.MethodGet, path: "/users/123"},
		{name: "update user", method: fiber.MethodPut, path: "/users/123", body: `{"name":"User"}`},
		{name: "delete user", method: fiber.MethodDelete, path: "/users/123"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			users := app.Group("/users", func(c *fiber.Ctx) error {
				c.Locals("role", entity.RoleUnit)
				return c.Next()
			}, middleware.RoleGuard(entity.RoleSuperAdmin))
			users.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
			users.Post("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusCreated) })
			users.Get("/:id", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
			users.Put("/:id", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
			users.Delete("/:id", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusNoContent) })

			req := httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(tt.body))
			if tt.body != "" {
				req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
			}

			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != fiber.StatusForbidden {
				payload, _ := io.ReadAll(resp.Body)
				t.Fatalf("expected status 403, got %d: %s", resp.StatusCode, payload)
			}
		})
	}
}
