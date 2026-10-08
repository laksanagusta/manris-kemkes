package http

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	identity "github.com/manris/backend/internal/identity/service"
	"github.com/manris/backend/internal/middleware"
	"strings"
	"time"
)

type IdentityAuthHandler struct {
	service      *identity.Service
	riskWorkflow bool
}

func NewIdentityAuthHandler(service *identity.Service, riskWorkflow bool) *IdentityAuthHandler {
	return &IdentityAuthHandler{service: service, riskWorkflow: riskWorkflow}
}

const appKeyHeader = "X-App-Key"

func bearerToken(c *fiber.Ctx) string {
	p := strings.SplitN(c.Get(fiber.HeaderAuthorization), " ", 2)
	if len(p) != 2 || !strings.EqualFold(p[0], "bearer") {
		return ""
	}
	return p[1]
}
func hasAppKey(c *fiber.Ctx) bool {
	found := false
	c.Request().Header.VisitAll(func(name, _ []byte) {
		if strings.EqualFold(string(name), appKeyHeader) {
			found = true
		}
	})
	return found
}
func identityError(c *fiber.Ctx, err error) error {
	status := fiber.StatusServiceUnavailable
	detail := "Layanan identitas tidak tersedia"
	switch {
	case errors.Is(err, domainerrors.ErrUnauthorized), errors.Is(err, domainerrors.ErrInvalidCredentials):
		status = fiber.StatusUnauthorized
		detail = "Credential aplikasi atau pengguna tidak valid"
	case errors.Is(err, domainerrors.ErrForbidden), errors.Is(err, domainerrors.ErrAccountInactive):
		status = fiber.StatusForbidden
		detail = "Akses ditolak"
	case errors.Is(err, domainerrors.ErrInvalidInput):
		status = fiber.StatusUnprocessableEntity
		detail = "Input tidak valid"
	case errors.Is(err, domainerrors.ErrConflict):
		status = fiber.StatusConflict
		detail = "ID aplikasi sudah digunakan"
	case errors.Is(err, domainerrors.ErrNotFound):
		status = fiber.StatusNotFound
		detail = "Data tidak ditemukan"
	}
	return c.Status(status).JSON(fiber.Map{"error": detail})
}
func (h *IdentityAuthHandler) profile(p *domain.Profile, appID string) any {
	if appID != domain.ManrisApplication {
		return p
	}
	// Manris feature flags are an adapter concern, never shared identity data.
	return struct {
		*domain.Profile
		Capabilities struct {
			RiskApprovalWorkflowEnabled bool `json:"riskApprovalWorkflowEnabled"`
		} `json:"capabilities"`
	}{Profile: p, Capabilities: struct {
		RiskApprovalWorkflowEnabled bool `json:"riskApprovalWorkflowEnabled"`
	}{h.riskWorkflow}}
}
func (h *IdentityAuthHandler) Login(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	var input LoginRequest
	if err := c.BodyParser(&input); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}
	var result *domain.LoginResult
	var err error
	if hasAppKey(c) {
		result, err = h.service.LoginWithKey(c.Context(), c.Get(appKeyHeader), input.NIP, input.Password)
	} else {
		result, err = h.service.Login(c.Context(), domain.ManrisApplication, input.NIP, input.Password)
	}
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": fiber.Map{"token": result.Token, "appId": result.AppID, "expiresAt": result.ExpiresAt, "sessionMode": result.SessionMode, "mustChangePassword": result.MustChangePassword, "user": h.profile(result.User, result.AppID)}})
}
func (h *IdentityAuthHandler) requestIdentity(c *fiber.Ctx) (*domain.Identity, error) {
	if hasAppKey(c) {
		return h.service.ValidateWithKey(c.Context(), c.Get(appKeyHeader), bearerToken(c))
	}
	return h.service.Validate(c.Context(), domain.ManrisApplication, bearerToken(c))
}
func (h *IdentityAuthHandler) Me(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	i, err := h.requestIdentity(c)
	if err != nil {
		return identityError(c, err)
	}
	c.Set("X-Auth-App-Id", i.ApplicationID)
	return c.JSON(fiber.Map{"data": h.profile(i.Profile, i.ApplicationID)})
}
func (h *IdentityAuthHandler) Logout(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	i, err := h.requestIdentity(c)
	if err != nil {
		return identityError(c, err)
	}
	if err := h.service.Logout(c.Context(), i.ApplicationID, bearerToken(c)); err != nil {
		return identityError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
func (h *IdentityAuthHandler) Roles(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	if _, err := h.requestIdentity(c); err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": []string{domain.RoleSuperAdmin, domain.RoleUnit, domain.RoleReviewer, domain.RolePimpinan}})
}
func (h *IdentityAuthHandler) CreateApplication(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	actor, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	var input struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}
	result, err := h.service.CreateApplication(c.Context(), input.ID, input.Name, actor)
	if err != nil {
		return identityError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}
func (h *IdentityAuthHandler) ListApplications(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	actor, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	result, err := h.service.ListApplications(c.Context(), actor)
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}
func (h *IdentityAuthHandler) RotateKey(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	actor, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	key, err := h.service.RotateKey(c.Context(), c.Params("id"), actor)
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": fiber.Map{"appKey": key}})
}
func (h *IdentityAuthHandler) DisableApplication(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	actor, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	if err := h.service.DisableApplication(c.Context(), c.Params("id"), actor); err != nil {
		return identityError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// Public auth routes must precede /auth group middleware.
func (h *IdentityAuthHandler) RegisterPublicRoutes(api fiber.Router) {
	api.Post("/auth/login", limiter.New(limiter.Config{Max: 20, Expiration: time.Minute}), h.Login)
	api.Get("/auth/me", h.Me)
	api.Post("/auth/logout", h.Logout)
	api.Get("/auth/roles", h.Roles)
	api.Get("/auth/organizations", h.Organizations)
	api.Put("/auth/me", h.UpdateProfile)
	api.Post("/auth/change-password", h.ChangePassword)
}
func (h *IdentityAuthHandler) RegisterManagementRoutes(api fiber.Router) {
	apps := api.Group("/auth/apps", middleware.IdentityRequired(h.service, domain.ManrisApplication), middleware.RequireFullSession(), middleware.RoleGuard(domain.RoleSuperAdmin))
	apps.Get("/", h.ListApplications)
	apps.Post("/", h.CreateApplication)
	apps.Post("/:id/rotate-key", h.RotateKey)
	apps.Delete("/:id", h.DisableApplication)
}

func (h *IdentityAuthHandler) UpdateProfile(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	i, err := h.requestIdentity(c)
	if err != nil {
		return identityError(c, err)
	}
	var input UpdateProfileRequest
	if err := c.BodyParser(&input); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}
	p, err := h.service.UpdateProfile(c.Context(), i.ApplicationID, bearerToken(c), identity.ProfileInput{Name: input.Name, Email: input.Email, NIP: input.NIP, Jabatan: input.Jabatan, Pangkat: input.Pangkat})
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": h.profile(p, i.ApplicationID)})
}
func (h *IdentityAuthHandler) ChangePassword(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	i, err := h.requestIdentity(c)
	if err != nil {
		return identityError(c, err)
	}
	var input ChangePasswordRequest
	if err := c.BodyParser(&input); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}
	r, err := h.service.ChangePassword(c.Context(), i.ApplicationID, bearerToken(c), input.CurrentPassword, input.NewPassword, input.ConfirmPassword)
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": fiber.Map{"token": r.Token, "appId": r.AppID, "expiresAt": r.ExpiresAt, "sessionMode": r.SessionMode, "mustChangePassword": r.MustChangePassword, "user": h.profile(r.User, r.AppID)}})
}
func (h *IdentityAuthHandler) Organizations(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	i, err := h.requestIdentity(c)
	if err != nil {
		return identityError(c, err)
	}
	orgs, err := h.service.Organizations(c.Context(), i.ApplicationID, bearerToken(c))
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": orgs})
}
