package http

import (
	"bytes"
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestParentCannotCreateOrMoveRecordsIntoDescendant(t *testing.T) {
	own, child := uuid.New(), uuid.New()
	risk, control := &RiskHandler{}, &ControlHandler{}
	for _, tt := range []struct {
		name, method, path, body string
		handler                  fiber.Handler
	}{
		{"create risk", "POST", "/risks", fmt.Sprintf(`{"organizationId":%q}`, child), risk.CreateRisk},
		{"create batch", "POST", "/risks/batch", fmt.Sprintf(`{"items":[{"organizationId":%q}]}`, child), risk.CreateRiskBatch},
		{"create batch query", "POST", "/risks/batch?organization_id=" + child.String(), `{"items":[{}]}`, risk.CreateRiskBatch},
		{"move risk", "PUT", "/risks/" + uuid.NewString(), fmt.Sprintf(`{"organizationId":%q}`, child), risk.UpdateRisk},
		{"create control", "POST", "/controls", fmt.Sprintf(`{"organizationId":%q}`, child), control.CreateControl},
	} {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				c.Locals("accessScope", &entity.AccessScope{OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, child}})
				c.Locals("userId", uuid.New())
				return c.Next()
			})
			path := tt.path
			if tt.name == "move risk" {
				path = "/risks/:id"
			}
			if tt.name == "create batch query" {
				path = "/risks/batch"
			}
			app.Add(tt.method, path, tt.handler)
			req := httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			response, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != fiber.StatusForbidden {
				t.Fatalf("status = %d, want 403", response.StatusCode)
			}
		})
	}
}

func TestUPRChildReadSelectionDoesNotChangeMutationOrganization(t *testing.T) {
	own, child, grandchild, outside, user := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	for _, tt := range []struct {
		method string
		org    uuid.UUID
		status int
		want   uuid.UUID
	}{
		{"GET", child, 200, child}, {"GET", grandchild, 200, grandchild},
		{"GET", outside, 403, uuid.Nil}, {"POST", child, 200, own}, {"DELETE", child, 200, own},
	} {
		t.Run(tt.method+tt.org.String(), func(t *testing.T) {
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				c.Locals("accessScope", &entity.AccessScope{UserID: user, OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, child, grandchild}})
				return c.Next()
			})
			app.Add(tt.method, "/workflow", uprRoute(func(c *fiber.Ctx, actor uprActor) error {
				if actor.org != tt.want {
					t.Errorf("organization = %s, want %s", actor.org, tt.want)
				}
				return c.SendStatus(200)
			}))
			response, err := app.Test(httptest.NewRequest(tt.method, "/workflow?org_id="+tt.org.String(), nil))
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != tt.status {
				t.Fatalf("status = %d, want %d", response.StatusCode, tt.status)
			}
		})
	}
}
