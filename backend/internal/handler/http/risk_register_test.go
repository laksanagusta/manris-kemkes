package http

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	repo "github.com/manris/backend/internal/domain/repository"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type riskRegisterRepoStub struct {
	registerFilter repo.RiskRegisterFilter
	registerItems  []*entity.Risk
	registerTotal  int
}

func (r *riskRegisterRepoStub) Create(context.Context, *entity.Risk) error { return nil }
func (r *riskRegisterRepoStub) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.Risk, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) Update(context.Context, *entity.Risk) error { return nil }
func (r *riskRegisterRepoStub) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *riskRegisterRepoStub) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) ListRegister(_ context.Context, filter repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	r.registerFilter = filter
	return r.registerItems, r.registerTotal, nil
}
func (r *riskRegisterRepoStub) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *riskRegisterRepoStub) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *riskRegisterRepoStub) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *riskRegisterRepoStub) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

func TestRiskRegisterListSupportsFiltersScopeAndPaginationEnvelope(t *testing.T) {
	orgOne := uuid.New()
	orgTwo := uuid.New()
	repo := &riskRegisterRepoStub{}
	handler := &RiskHandler{listRegisterUC: riskuc.NewListRiskRegisterUseCase(repo)}

	app := fiber.New()
	app.Get("/risks/register", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{AccessibleOrgIDs: []uuid.UUID{orgOne, orgTwo}})
		return c.Next()
	}, handler.ListRiskRegister)

	req := httptest.NewRequest(
		fiber.MethodGet,
		"/risks/register?status=approved&category=kepatuhan&org_id="+orgTwo.String()+"&assessment_cycle=2026-H1&q=server&page=0&limit=101",
		nil,
	)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, body)
	}

	if len(repo.registerFilter.OrgIDs) != 1 || repo.registerFilter.OrgIDs[0] != orgTwo {
		t.Fatalf("expected narrowed org scope [%s], got %v", orgTwo, repo.registerFilter.OrgIDs)
	}
	if repo.registerFilter.Status != entity.RiskStatusApproved {
		t.Fatalf("expected status approved, got %q", repo.registerFilter.Status)
	}
	if repo.registerFilter.Category != entity.RiskCategoryKepatuhan {
		t.Fatalf("expected category kepatuhan, got %q", repo.registerFilter.Category)
	}
	if repo.registerFilter.AssessmentCycle != "2026-H1" {
		t.Fatalf("expected assessment cycle 2026-H1, got %q", repo.registerFilter.AssessmentCycle)
	}
	if repo.registerFilter.Query != "server" {
		t.Fatalf("expected q server, got %q", repo.registerFilter.Query)
	}
	if repo.registerFilter.Page != 1 {
		t.Fatalf("expected clamped page 1, got %d", repo.registerFilter.Page)
	}
	if repo.registerFilter.Limit != 100 {
		t.Fatalf("expected clamped limit 100, got %d", repo.registerFilter.Limit)
	}

	var payload struct {
		Data  []map[string]any `json:"data"`
		Total int              `json:"total"`
		Page  int              `json:"page"`
		Limit int              `json:"limit"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data == nil {
		t.Fatal("expected non-nil data array")
	}
	if len(payload.Data) != 0 {
		t.Fatalf("expected empty data array, got %d items", len(payload.Data))
	}
	if payload.Total != 0 {
		t.Fatalf("expected total 0, got %d", payload.Total)
	}
	if payload.Page != 1 {
		t.Fatalf("expected page 1, got %d", payload.Page)
	}
	if payload.Limit != 100 {
		t.Fatalf("expected limit 100, got %d", payload.Limit)
	}
}

func TestRiskRegisterListRejectsInvalidCategory(t *testing.T) {
	handler := &RiskHandler{}
	app := fiber.New()
	app.Get("/risks/register", handler.ListRiskRegister)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/register?category=invalid", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 400, got %d: %s", resp.StatusCode, body)
	}
}
