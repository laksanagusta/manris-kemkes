package http

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	domainrepo "github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
	keyuc "github.com/manris/backend/internal/usecase/organization_api_key"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type integrationKeyRepo struct {
	key     *entity.OrganizationAPIKey
	limited bool
}

func (r *integrationKeyRepo) Get(context.Context, uuid.UUID) (*entity.OrganizationAPIKey, error) {
	return r.key, nil
}
func (r *integrationKeyRepo) Save(_ context.Context, k *entity.OrganizationAPIKey, _ uuid.UUID, _ *uuid.UUID) error {
	r.key = k
	return nil
}
func (r *integrationKeyRepo) AuthenticateAndConsume(_ context.Context, hash string) (*entity.APIKeyAdmission, error) {
	if r.key == nil || hash != r.key.Hash {
		return nil, domainerrors.ErrUnauthorized
	}
	return &entity.APIKeyAdmission{OrganizationID: r.key.OrganizationID, Allowed: !r.limited, RetryAfter: 42}, nil
}

type integrationRiskRepo struct {
	domainrepo.RiskRepository
	cycle  string
	orgIDs []uuid.UUID
}

func (r *integrationRiskRepo) HeatmapData(_ context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.HeatmapCell, error) {
	r.cycle = cycle
	r.orgIDs = orgIDs
	return []*entity.HeatmapCell{{Probability: 2, Impact: 4, Count: 3}}, nil
}

func TestAPIKeyRouteIsolationAndExistingHeatmap(t *testing.T) {
	keyRepo := &integrationKeyRepo{}
	service := keyuc.NewService(keyRepo, nil)
	generated, err := service.Generate(context.Background(), uuid.New(), uuid.New(), nil)
	if err != nil {
		t.Fatal(err)
	}
	riskRepo := &integrationRiskRepo{}
	handler := &RiskHandler{heatmapDataUC: riskuc.NewHeatmapDataUseCase(riskRepo)}
	keyHandler := NewOrganizationAPIKeyHandler(service)
	app := fiber.New()
	api := app.Group("/api/v1")
	api.Get("/dashboard/heatmap", keyHandler.Heatmap(handler.HeatmapData))
	protected := api.Group("", middleware.AuthRequired("test-secret"), middleware.RequireFullSession())
	jwtOrg := uuid.New()
	protected.Get("/dashboard/heatmap", func(c *fiber.Ctx) error {
		c.Locals(middleware.AccessScopeKey, &entity.AccessScope{OrganizationID: &jwtOrg})
		return handler.HeatmapData(c)
	})
	protected.Get("/dashboard/summary", func(c *fiber.Ctx) error { return c.SendStatus(200) })
	protected.Post("/organization-api-key/generate", keyHandler.Generate)
	protected.Post("/dashboard/heatmap", func(c *fiber.Ctx) error { return c.SendStatus(200) })

	for _, tc := range []struct {
		name, method, path, key string
		want                    int
	}{
		{"valid key", "GET", "/dashboard/heatmap?cycle=2026-Q1", generated.Secret, 200},
		{"cannot override organization", "GET", "/dashboard/heatmap?cycle=2026-Q2&organizationId=" + uuid.NewString(), generated.Secret, 200},
		{"bad cycle", "GET", "/dashboard/heatmap?cycle=2026-H1", generated.Secret, 400},
		{"missing credential", "GET", "/dashboard/heatmap", "", 401},
		{"invalid key", "GET", "/dashboard/heatmap", "wrong", 401},
		{"other endpoint", "GET", "/dashboard/summary", generated.Secret, 401},
		{"management", "POST", "/organization-api-key/generate", generated.Secret, 401},
		{"write method", "POST", "/dashboard/heatmap", generated.Secret, 401},
		{"head method", "HEAD", "/dashboard/heatmap", generated.Secret, 401},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, "/api/v1"+tc.path, nil)
			req.Header.Set("X-API-Key", tc.key)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != tc.want {
				t.Fatalf("status=%d want %d", resp.StatusCode, tc.want)
			}
			if tc.want == 200 {
				if len(riskRepo.orgIDs) != 1 || riskRepo.orgIDs[0] != generated.Key.OrganizationID {
					t.Fatalf("organization scope=%v", riskRepo.orgIDs)
				}
				var body struct {
					Data [5][5]int `json:"data"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
					t.Fatal(err)
				}
				if body.Data[1][3] != 3 || resp.Header.Get("Cache-Control") != "no-store" {
					t.Fatalf("response=%v", body)
				}
			}
		})
	}
	token, err := middleware.GenerateToken(uuid.New(), "test", "unit", jwtOrg.String(), false, "test-secret", 1)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("GET", "/api/v1/dashboard/heatmap", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 || riskRepo.orgIDs[0] != jwtOrg {
		t.Fatalf("existing JWT flow failed: %d %v", resp.StatusCode, riskRepo.orgIDs)
	}
	keyRepo.limited = true
	req = httptest.NewRequest("GET", "/api/v1/dashboard/heatmap", nil)
	req.Header.Set("X-API-Key", generated.Secret)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 429 || resp.Header.Get("Retry-After") != "42" {
		t.Fatalf("quota response=%d %v", resp.StatusCode, resp.Header)
	}
}
