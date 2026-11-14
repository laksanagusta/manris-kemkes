package http

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestMonitoringRuleWriteAuthorization(t *testing.T) {
	for _, tt := range []struct {
		name, role    string
		authenticated bool
		want          int
	}{{"canonical superadmin", "superadmin", true, 422}, {"legacy role alias", "super_admin", true, 422}, {"unit cannot create", "unit", true, 403}, {"reviewer cannot create", "reviewer", true, 403}, {"unauthenticated cannot create", "", false, 403}} {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				if tt.authenticated {
					c.Locals("accessScope", &entity.AccessScope{UserID: uuid.New(), Role: tt.role, IsGlobal: tt.role == entity.RoleSuperAdmin})
				}
				return c.Next()
			})
			registerMonitoringRuleRoutes(app, postgres.NewUPRWorkflow(nil))
			req := httptest.NewRequest("POST", "/monitoring-rules", strings.NewReader(`{}`))
			req.Header.Set("Content-Type", "application/json")
			response, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != tt.want {
				t.Fatalf("status=%d want=%d", response.StatusCode, tt.want)
			}
		})
	}
}

func TestAnnualInitiationRequiresMonitoringRule(t *testing.T) {
	app := fiber.New()
	org := uuid.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{UserID: uuid.New(), Role: entity.RoleUnit, OrganizationID: &org})
		return c.Next()
	})
	RegisterUPRWorkflowRoutes(app, postgres.NewUPRWorkflow(nil))
	req := httptest.NewRequest("POST", "/annual-profiles/2026/initiate", strings.NewReader(`{"riskIds":["`+uuid.NewString()+`"]}`))
	req.Header.Set("Content-Type", "application/json")
	response, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 422 {
		t.Fatalf("status=%d want422", response.StatusCode)
	}
}
