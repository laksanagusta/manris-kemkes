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
func (r *riskRegisterRepoStub) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
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
func (r *riskRegisterRepoStub) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
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
func (r *riskRegisterRepoStub) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
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
		c.Locals("accessScope", &entity.AccessScope{
			OrganizationID:   &orgOne,
			AccessibleOrgIDs: []uuid.UUID{orgOne, orgTwo},
		})
		return c.Next()
	}, handler.ListRiskRegister)

	req := httptest.NewRequest(
		fiber.MethodGet,
		"/risks/register?status=approved&category=kepatuhan&lifecycle=archived&org_id="+orgOne.String()+"&assessment_cycle=2026-H1&q=server&page=0&limit=101",
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

	if len(repo.registerFilter.OrgIDs) != 1 || repo.registerFilter.OrgIDs[0] != orgOne {
		t.Fatalf("expected narrowed org scope [%s], got %v", orgOne, repo.registerFilter.OrgIDs)
	}
	if repo.registerFilter.Status != entity.RiskStatusApproved {
		t.Fatalf("expected status approved, got %q", repo.registerFilter.Status)
	}
	if repo.registerFilter.Category != entity.RiskCategoryKepatuhan {
		t.Fatalf("expected category kepatuhan, got %q", repo.registerFilter.Category)
	}
	if repo.registerFilter.Lifecycle != "archived" {
		t.Fatalf("expected lifecycle archived, got %q", repo.registerFilter.Lifecycle)
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

func TestRiskRegisterListDefaultsToOwnOrgInsteadOfDescendants(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	repo := &riskRegisterRepoStub{}
	handler := &RiskHandler{listRegisterUC: riskuc.NewListRiskRegisterUseCase(repo)}

	app := fiber.New()
	app.Get("/risks/register", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleUnit,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.ListRiskRegister)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/register", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(repo.registerFilter.OrgIDs) != 1 || repo.registerFilter.OrgIDs[0] != own {
		t.Fatalf("expected own-org-only filter [%s], got %v", own, repo.registerFilter.OrgIDs)
	}
}

func TestRiskRegisterListRejectsDescendantOrgFilterOnOperationalSurface(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	repo := &riskRegisterRepoStub{}
	handler := &RiskHandler{listRegisterUC: riskuc.NewListRiskRegisterUseCase(repo)}

	app := fiber.New()
	app.Get("/risks/register", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleReviewer,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.ListRiskRegister)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/register?org_id="+descendant.String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}

func TestRiskRegisterListSupportsMonitoringTransactionsView(t *testing.T) {
	orgID := uuid.New()
	repo := &riskRegisterRepoStub{
		registerItems: []*entity.Risk{
			{
				ID:                    uuid.New(),
				Code:                  "R-002",
				Title:                 "Gangguan layanan semesteran",
				Status:                entity.RiskStatusApproved,
				Category:              entity.RiskCategoryOperasional,
				VersionNumber:         2,
				AssessmentCycle:       "2026-H1",
				BeforeMonitoringNilai: floatPtr(12.5),
				MonitoringResultNilai: floatPtr(9.75),
			},
		},
		registerTotal: 1,
	}
	handler := &RiskHandler{listRegisterUC: riskuc.NewListRiskRegisterUseCase(repo)}

	app := fiber.New()
	app.Get("/risks/register", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			OrganizationID:   &orgID,
			AccessibleOrgIDs: []uuid.UUID{orgID},
		})
		return c.Next()
	}, handler.ListRiskRegister)

	req := httptest.NewRequest(
		fiber.MethodGet,
		"/risks/register?view=monitoring-transactions&assessment_cycle=2026-H1",
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
	if repo.registerFilter.View != "monitoring-transactions" {
		t.Fatalf("expected view monitoring-transactions, got %q", repo.registerFilter.View)
	}

	var payload struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected 1 data item, got %d", len(payload.Data))
	}
	if payload.Data[0]["beforeMonitoringNilai"] != 12.5 {
		t.Fatalf("expected beforeMonitoringNilai 12.5, got %#v", payload.Data[0]["beforeMonitoringNilai"])
	}
	if payload.Data[0]["monitoringResultNilai"] != 9.75 {
		t.Fatalf("expected monitoringResultNilai 9.75, got %#v", payload.Data[0]["monitoringResultNilai"])
	}
}

func TestRiskRegisterListRejectsInvalidLifecycle(t *testing.T) {
	handler := &RiskHandler{}
	app := fiber.New()
	app.Get("/risks/register", handler.ListRiskRegister)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/register?lifecycle=disabled", nil)
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

func TestRiskRegisterListRejectsInvalidView(t *testing.T) {
	handler := &RiskHandler{}
	app := fiber.New()
	app.Get("/risks/register", handler.ListRiskRegister)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/register?view=unknown", nil)
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

func TestRiskRegisterListSerializesReviewScheduleText(t *testing.T) {
	reviewDate := "2026-12-31"
	repo := &riskRegisterRepoStub{
		registerItems: []*entity.Risk{
			{
				ID:                 uuid.New(),
				Code:               "R-001",
				Title:              "Server outage",
				Status:             entity.RiskStatusApproved,
				Category:           entity.RiskCategoryOperasional,
				NextReviewDate:     &reviewDate,
				ReviewScheduleText: "Ditinjau pada rapat koordinasi bulanan",
			},
		},
		registerTotal: 1,
	}
	handler := &RiskHandler{listRegisterUC: riskuc.NewListRiskRegisterUseCase(repo)}

	app := fiber.New()
	app.Get("/risks/register", handler.ListRiskRegister)

	resp, err := app.Test(httptest.NewRequest(fiber.MethodGet, "/risks/register", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, body)
	}

	var payload struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected 1 data item, got %d", len(payload.Data))
	}
	if payload.Data[0]["reviewScheduleText"] != "Ditinjau pada rapat koordinasi bulanan" {
		t.Fatalf("expected reviewScheduleText in response, got %#v", payload.Data[0]["reviewScheduleText"])
	}
	if payload.Data[0]["nextReviewDate"] != reviewDate {
		t.Fatalf("expected nextReviewDate %q, got %#v", reviewDate, payload.Data[0]["nextReviewDate"])
	}
}

func floatPtr(v float64) *float64 { return &v }
