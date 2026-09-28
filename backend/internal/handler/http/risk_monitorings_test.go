package http

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	repo "github.com/manris/backend/internal/domain/repository"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type riskMonitoringListRepoStub struct {
	filter repo.RiskMonitoringListFilter
	items  []*entity.RiskMonitoring
	total  int
}

type riskMonitoringDeleteRepoStub struct {
	monitoring *entity.RiskMonitoring
	deleted    bool
}

func (r *riskMonitoringDeleteRepoStub) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.RiskMonitoring, error) {
	return r.monitoring, nil
}

func (r *riskMonitoringDeleteRepoStub) DeleteDraft(context.Context, uuid.UUID, []uuid.UUID) error {
	r.deleted = true
	return nil
}

func (r *riskMonitoringListRepoStub) List(_ context.Context, filter repo.RiskMonitoringListFilter) ([]*entity.RiskMonitoring, int, error) {
	r.filter = filter
	return r.items, r.total, nil
}

func TestRiskMonitoringsListReturnsMonitoringEnvelope(t *testing.T) {
	orgID := uuid.New()
	sourceRiskID := uuid.New()
	monitoringID := uuid.New()
	repoStub := &riskMonitoringListRepoStub{
		items: []*entity.RiskMonitoring{
			{
				ID:              monitoringID,
				AssessmentCycle: "2026-H1",
				Status:          entity.RiskMonitoringStatusDraft,
				SourceRisk: &entity.Risk{
					ID:             sourceRiskID,
					Code:           "R-100",
					Title:          "Gangguan layanan",
					Category:       entity.RiskCategoryOperasional,
					VersionNumber:  3,
					OrganizationID: &orgID,
				},
				SourceNilai:          12.5,
				ObservedNilai:        9.75,
				StartedAt:            time.Now().UTC(),
				DraftTreatmentOption: "mitigasi",
			},
		},
		total: 1,
	}

	handler := &RiskHandler{
		listMonitoringUC: riskuc.NewListRiskMonitoringsUseCase(repoStub),
	}

	app := fiber.New()
	app.Get("/risk-monitorings", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			OrganizationID:   &orgID,
			AccessibleOrgIDs: []uuid.UUID{orgID},
		})
		return c.Next()
	}, handler.ListRiskMonitorings)

	req := httptest.NewRequest(
		fiber.MethodGet,
		"/risk-monitorings?q=layanan&assessment_cycle=2026-H1&status=draft&page=1&limit=10",
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
	if repoStub.filter.Query != "layanan" {
		t.Fatalf("expected query layanan, got %q", repoStub.filter.Query)
	}
	if repoStub.filter.AssessmentCycle != "2026-H1" {
		t.Fatalf("expected assessment cycle 2026-H1, got %q", repoStub.filter.AssessmentCycle)
	}
	if repoStub.filter.Status != "draft" {
		t.Fatalf("expected status draft, got %q", repoStub.filter.Status)
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
	if len(payload.Data) != 1 {
		t.Fatalf("expected 1 item, got %d", len(payload.Data))
	}
	if payload.Total != 1 {
		t.Fatalf("expected total 1, got %d", payload.Total)
	}
	if payload.Page != 1 || payload.Limit != 10 {
		t.Fatalf("expected page 1 limit 10, got page=%d limit=%d", payload.Page, payload.Limit)
	}
	if payload.Data[0]["status"] != entity.RiskMonitoringStatusDraft {
		t.Fatalf("expected draft status in response, got %#v", payload.Data[0]["status"])
	}
}

func TestDeleteMonitoringDeletesDraftAndReturnsEnvelope(t *testing.T) {
	orgID := uuid.New()
	repoStub := &riskMonitoringDeleteRepoStub{
		monitoring: &entity.RiskMonitoring{
			ID:     uuid.New(),
			Status: entity.RiskMonitoringStatusDraft,
		},
	}
	handler := &RiskHandler{
		deleteMonitoringUC: riskuc.NewDeleteMonitoringUseCase(repoStub),
	}

	app := fiber.New()
	app.Delete("/risk-monitorings/:id", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			OrganizationID:   &orgID,
			AccessibleOrgIDs: []uuid.UUID{orgID},
		})
		return c.Next()
	}, handler.DeleteMonitoring)

	resp, err := app.Test(httptest.NewRequest(
		fiber.MethodDelete,
		"/risk-monitorings/"+repoStub.monitoring.ID.String(),
		nil,
	))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, body)
	}
	if !repoStub.deleted {
		t.Fatal("expected DeleteDraft to be called")
	}
	var payload struct {
		Data struct {
			Message string `json:"message"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data.Message == "" {
		t.Fatal("expected delete confirmation message")
	}
}
