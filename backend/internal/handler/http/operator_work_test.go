package http

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	workuc "github.com/manris/backend/internal/usecase/operator_work"
	"net/http/httptest"
	"testing"
	"time"
)

type workRepoStub struct {
	org        uuid.UUID
	candidates []workuc.Candidate
}

func (r *workRepoStub) ListCandidates(_ context.Context, org uuid.UUID, _ time.Time) ([]workuc.Candidate, error) {
	r.org = org
	return r.candidates, nil
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
		{"invalid section", "/work-items?section=unknown", "unit", true, 400},
		{"invalid view", "/work-items?view=unknown", "unit", true, 400},
		{"conflicting query", "/work-items?view=sections&section=reports", "unit", true, 400},
		{"summary", "/work-items?view=sections", "unit", true, 200},
		{"section", "/work-items?section=reports", "unit", true, 200},
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

func TestOperatorWorkGroupedHTTPContract(t *testing.T) {
	org, actor, other := uuid.New(), uuid.New(), uuid.New()
	repo := &workRepoStub{}
	for i := 0; i < 7; i++ {
		repo.candidates = append(repo.candidates, workuc.Candidate{Item: entity.OperatorWorkItem{Key: fmt.Sprint(i), Kind: "risk_draft"}, OwnerID: &actor})
	}
	repo.candidates = append(repo.candidates, workuc.Candidate{Item: entity.OperatorWorkItem{Key: "other", Kind: "risk_draft"}, OwnerID: &other})
	handler := NewOperatorWorkHandler(workuc.NewService(repo))
	app := fiber.New()
	app.Get("/work-items", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{UserID: actor, Role: "unit", OrganizationID: &org})
		return handler.List(c)
	})
	resp, err := app.Test(httptest.NewRequest("GET", "/work-items?view=sections", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var summary struct{ Data entity.OperatorWorkSummary }
	if err := json.NewDecoder(resp.Body).Decode(&summary); err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 || len(summary.Data.Sections) != 3 || summary.Data.Sections[2].Total != 7 || len(summary.Data.Sections[2].Items) != 5 || summary.Data.Today == "" {
		t.Fatalf("incorrect summary: %#v", summary)
	}
	full, err := app.Test(httptest.NewRequest("GET", "/work-items?section=drafts&page=2&limit=5", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer full.Body.Close()
	var page struct{ Data entity.OperatorWorkPage }
	if err := json.NewDecoder(full.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if full.StatusCode != 200 || page.Data.Total != 7 || len(page.Data.Items) != 2 || page.Data.HasNext || page.Data.Today == "" {
		t.Fatalf("incorrect filtered page: %#v", page)
	}
}
