package middleware

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/service"
)

// IdentityRequired validates via the identity service and uses live shared roles and organizations.
func IdentityRequired(validator service.Validator, applicationID string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		parts := strings.SplitN(c.Get(fiber.HeaderAuthorization), " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") || parts[1] == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "token pengguna diperlukan"})
		}
		i, err := validator.Validate(c.Context(), applicationID, parts[1])
		if err != nil {
			status := fiber.StatusServiceUnavailable
			if errors.Is(err, domainerrors.ErrUnauthorized) || errors.Is(err, domainerrors.ErrForbidden) {
				status = fiber.StatusUnauthorized
			}
			return c.Status(status).JSON(fiber.Map{"error": "identitas tidak dapat diverifikasi"})
		}
		if i == nil || i.Profile == nil || i.ApplicationID != applicationID {
			return c.SendStatus(fiber.StatusUnauthorized)
		}
		p := i.Profile
		orgID := ""
		if p.OrganizationID != nil {
			orgID = p.OrganizationID.String()
		}
		c.Locals("userId", p.ID)
		c.Locals("username", p.Username)
		c.Locals("role", p.Role)
		c.Locals("organizationId", orgID)
		c.Locals("setupOnly", p.MustChangePassword)
		c.Locals("identity", i)
		c.Locals(AccessScopeKey, &entity.AccessScope{UserID: p.ID, Role: p.Role, OrganizationID: p.OrganizationID, AccessibleOrgIDs: p.AccessibleOrgIDs, IsGlobal: p.IsGlobal})
		return c.Next()
	}
}
