package http

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
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

func TestMonitoringRuleManagementAuthorization(t *testing.T) {
	for _, method := range []string{"PUT", "DELETE"} {
		for _, role := range []string{"", "unit", "reviewer", "pimpinan", "superadmin", "super_admin"} {
			t.Run(method+"/"+role, func(t *testing.T) {
				app := fiber.New()
				app.Use(func(c *fiber.Ctx) error {
					if role != "" {
						c.Locals("accessScope", &entity.AccessScope{UserID: uuid.New(), Role: role})
					}
					return c.Next()
				})
				registerMonitoringRuleRoutes(app, postgres.NewUPRWorkflow(nil))
				req := httptest.NewRequest(method, "/monitoring-rules/invalid-id", strings.NewReader(`{}`))
				req.Header.Set("Content-Type", "application/json")
				response, err := app.Test(req)
				if err != nil {
					t.Fatal(err)
				}
				defer response.Body.Close()
				want := 403
				if role == "superadmin" || role == "super_admin" {
					want = 400
				}
				if response.StatusCode != want {
					t.Fatalf("status=%d want=%d", response.StatusCode, want)
				}
			})
		}
	}
}

func TestMonitoringRuleActiveConflictResponse(t *testing.T) {
	app := fiber.New()
	app.Post("/test", func(c *fiber.Ctx) error {
		return handleError(c, &pgconn.PgError{Code: "23505", ConstraintName: "monitoring_rules_one_active_per_year"})
	})
	response, err := app.Test(httptest.NewRequest("POST", "/test", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 409 {
		t.Fatalf("status=%d want409", response.StatusCode)
	}
}

func TestMonitoringRuleSearchRejectsInvalidLimits(t *testing.T) {
	for _, limit := range []string{"0", "-1", "101"} {
		t.Run(limit, func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				c.Locals("accessScope", &entity.AccessScope{UserID: uuid.New(), Role: "unit"})
				return c.Next()
			})
			registerMonitoringRuleRoutes(app, postgres.NewUPRWorkflow(nil))
			response, err := app.Test(httptest.NewRequest("GET", "/monitoring-rules?search=test&limit="+limit, nil))
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != 422 {
				t.Fatalf("status=%d, want 422", response.StatusCode)
			}
		})
	}
}

func TestAdministrativeClosureAuthorizationWithoutHomeOrganization(t *testing.T) {
	for _, tc := range []struct {
		role string
		want int
	}{
		{"superadmin", fiber.StatusBadRequest},
		{"super_admin", fiber.StatusBadRequest},
		{"unit", fiber.StatusForbidden},
		{"reviewer", fiber.StatusForbidden},
		{"", fiber.StatusForbidden},
	} {
		t.Run(tc.role, func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				if tc.role != "" {
					c.Locals("accessScope", &entity.AccessScope{UserID: uuid.New(), Role: tc.role, IsGlobal: true})
				}
				return c.Next()
			})
			registerMonitoringRuleRoutes(app, postgres.NewUPRWorkflow(nil))
			request := httptest.NewRequest("POST", "/annual-profile-versions/bad/periods/bad/administrative-closure", nil)
			response, err := app.Test(request)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != tc.want {
				t.Fatalf("status=%d, want %d", response.StatusCode, tc.want)
			}
		})
	}
}
