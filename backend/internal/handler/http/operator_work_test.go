package http

import (
	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	workuc "github.com/manris/backend/internal/usecase/operator_work"
	"net/http/httptest"
	"testing"
	"time"
)

type workRepoStub struct{ org uuid.UUID }

func (r *workRepoStub) ListCandidates(_ context.Context, org uuid.UUID, _ time.Time) ([]workuc.Candidate, error) {
	r.org = org
	return []workuc.Candidate{}, nil
}
func TestOperatorWorkScopeAndPagination(t *testing.T) {
	org, actor := uuid.New(), uuid.New()
	for _, tt := range []struct {
		name, url, role string
		scope           bool
		want            int
	}{
		{"own unit", "/work-items", "unit", true, 200},
		{"missing scope", "/work-items", "unit", false, 403},
		{"other role", "/work-items", "reviewer", true, 403},
		{"invalid page", "/work-items?page=wrong", "unit", true, 400},
		{"invalid limit", "/work-items?limit=100", "unit", true, 400},
		{"other organization", "/work-items?organization_id=" + uuid.NewString(), "unit", true, 403},
	} {
		t.Run(tt.name, func(t *testing.T) {
			repo := &workRepoStub{}
			h := NewOperatorWorkHandler(workuc.NewService(repo))
			app := fiber.New()
			app.Get("/work-items", func(c *fiber.Ctx) error {
				if tt.scope {
					c.Locals("accessScope", &entity.AccessScope{UserID: actor, Role: tt.role, OrganizationID: &org})
				}
				return h.List(c)
			})
			resp, err := app.Test(httptest.NewRequest("GET", tt.url, nil))
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != tt.want {
				t.Fatalf("got %d want %d", resp.StatusCode, tt.want)
			}
			if tt.want == 200 && repo.org != org {
				t.Fatal("incorrect organization")
			}
		})
	}
}
