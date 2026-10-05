package http

import (
	"errors"
	"regexp"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	keyuc "github.com/manris/backend/internal/usecase/organization_api_key"
)

type OrganizationAPIKeyHandler struct{ service *keyuc.Service }

func NewOrganizationAPIKeyHandler(service *keyuc.Service) *OrganizationAPIKeyHandler {
	return &OrganizationAPIKeyHandler{service: service}
}

func (h *OrganizationAPIKeyHandler) organization(c *fiber.Ctx) (uuid.UUID, uuid.UUID, error) {
	actorID, ok := c.Locals("userId").(uuid.UUID)
	if !ok || actorID == uuid.Nil {
		return uuid.Nil, uuid.Nil, domainerrors.ErrUnauthorized
	}
	var requested *uuid.UUID
	if raw := c.Query("organizationId"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return uuid.Nil, uuid.Nil, domainerrors.ErrInvalidInput
		}
		requested = &parsed
	}
	orgID, err := h.service.Organization(c.Context(), actorID, requested)
	return orgID, actorID, err
}

func (h *OrganizationAPIKeyHandler) Get(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	orgID, _, err := h.organization(c)
	if err != nil {
		return handleError(c, err)
	}
	key, err := h.service.Get(c.Context(), orgID)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": key})
}

func (h *OrganizationAPIKeyHandler) Generate(c *fiber.Ctx) error   { return h.generate(c, false) }
func (h *OrganizationAPIKeyHandler) Regenerate(c *fiber.Ctx) error { return h.generate(c, true) }

func (h *OrganizationAPIKeyHandler) generate(c *fiber.Ctx, regenerate bool) error {
	c.Set(fiber.HeaderCacheControl, "no-store")
	orgID, actorID, err := h.organization(c)
	if err != nil {
		return handleError(c, err)
	}
	var expectedID *uuid.UUID
	if regenerate {
		var body struct {
			ExpectedKeyID uuid.UUID `json:"expectedKeyId"`
		}
		if err := c.BodyParser(&body); err != nil || body.ExpectedKeyID == uuid.Nil {
			return handleError(c, domainerrors.ErrInvalidInput)
		}
		expectedID = &body.ExpectedKeyID
	}
	result, err := h.service.Generate(c.Context(), orgID, actorID, expectedID)
	if errors.Is(err, domainerrors.ErrConflict) {
		return sendProblemDetails(c, fiber.StatusConflict, "API key berubah", "https://api.manris.com/errors/conflict",
			"API key telah dibuat atau diganti pengguna lain. Muat ulang sebelum melanjutkan.")
	}
	if err != nil {
		return handleError(c, err)
	}
	if !regenerate {
		c.Status(fiber.StatusCreated)
	}
	return c.JSON(fiber.Map{"data": result})
}

var integrationQuarterPattern = regexp.MustCompile(`^[1-9][0-9]{3}-Q[1-4]$`)

// Heatmap is registered BEFORE the JWT-protected group, for this GET route only.
// Requests without X-API-Key continue into the existing JWT route unchanged.
func (h *OrganizationAPIKeyHandler) Heatmap(next fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Method() != fiber.MethodGet {
			return c.Next()
		}
		secret := c.Get("X-API-Key")
		if secret == "" {
			return c.Next()
		}
		c.Set(fiber.HeaderCacheControl, "no-store")
		admission, err := h.service.Authenticate(c.Context(), secret)
		if err != nil {
			return handleError(c, err)
		}
		if admission == nil || admission.OrganizationID == uuid.Nil {
			return handleError(c, domainerrors.ErrUnauthorized)
		}
		if !admission.Allowed {
			c.Set(fiber.HeaderRetryAfter, strconv.Itoa(admission.RetryAfter))
			return sendProblemDetails(c, fiber.StatusTooManyRequests, "Batas permintaan tercapai", "https://api.manris.com/errors/rate-limit",
				"Maksimal 60 permintaan per menit per organisasi. Coba lagi setelah waktu Retry-After.")
		}
		if cycle := c.Query("cycle"); cycle != "" && !integrationQuarterPattern.MatchString(cycle) {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Periode tidak valid", "https://api.manris.com/errors/bad-request", "Gunakan periode YYYY-Q1 sampai YYYY-Q4.")
		}
		orgID := admission.OrganizationID
		c.Locals(middleware.AccessScopeKey, &entity.AccessScope{
			OrganizationID: &orgID, AccessibleOrgIDs: []uuid.UUID{orgID}, IsGlobal: false,
		})
		return next(c)
	}
}
