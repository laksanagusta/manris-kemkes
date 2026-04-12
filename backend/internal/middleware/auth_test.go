package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestAuthRequiredParsesSetupOnlyJWTClaims(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	token, err := GenerateToken(userID, "pending-user", "unit", orgID.String(), true, "secret", 24)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	app := fiber.New()
	app.Get("/protected", AuthRequired("secret"), func(c *fiber.Ctx) error {
		if got := c.Locals("userId"); got != userID {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "unexpected userId local"})
		}
		if got := c.Locals("username"); got != "pending-user" {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "unexpected username local"})
		}
		if got := c.Locals("role"); got != "unit" {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "unexpected role local"})
		}
		if got := c.Locals("organizationId"); got != orgID.String() {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "unexpected organizationId local"})
		}
		if got := c.Locals("setupOnly"); got != true {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "unexpected setupOnly local"})
		}
		return c.SendStatus(fiber.StatusNoContent)
	})

	req := httptest.NewRequest(fiber.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusNoContent {
		t.Fatalf("expected status 204, got %d", resp.StatusCode)
	}
}

func TestRequireFullSessionBlocksSetupOnlyToken(t *testing.T) {
	userID := uuid.New()
	token, err := GenerateToken(userID, "pending-user", "unit", "", true, "secret", 24)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	app := fiber.New()
	app.Get("/dashboard/summary", AuthRequired("secret"), RequireFullSession(), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	req := httptest.NewRequest(fiber.MethodGet, "/dashboard/summary", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}
