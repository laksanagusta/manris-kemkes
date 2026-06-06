package http

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
	performanceriskuc "github.com/manris/backend/internal/usecase/performancerisk"
)

type performanceRiskHandlerRepo struct{}

func (performanceRiskHandlerRepo) ListPlanningNodes(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error) {
	return nil, nil
}

func (performanceRiskHandlerRepo) ListRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return nil, nil
}

func (performanceRiskHandlerRepo) ListMitigationRowsByROID(context.Context, uuid.UUID, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error) {
	return nil, nil
}

func (performanceRiskHandlerRepo) ListUnlinkedRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return nil, nil
}

func TestPerformanceRiskHandlerRejectsMissingPeriod(t *testing.T) {
	handler := NewPerformanceRiskHandler(
		performanceriskuc.NewSummaryUseCase(performanceRiskHandlerRepo{}),
		performanceriskuc.NewPlanningMapUseCase(performanceRiskHandlerRepo{}),
		performanceriskuc.NewDetailUseCase(performanceRiskHandlerRepo{}),
		performanceriskuc.NewUnlinkedUseCase(performanceRiskHandlerRepo{}),
		nil,
	)

	app := fiber.New()
	app.Get("/summary", handler.Summary)

	resp, err := app.Test(httptest.NewRequest("GET", "/summary", nil))
	if err != nil {
		t.Fatalf("app.Test error = %v", err)
	}
	if resp.StatusCode != 400 {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestPerformanceRiskHandlerRejectsForbiddenOrg(t *testing.T) {
	ownOrg := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	otherOrg := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	handler := NewPerformanceRiskHandler(
		performanceriskuc.NewSummaryUseCase(performanceRiskHandlerRepo{}),
		performanceriskuc.NewPlanningMapUseCase(performanceRiskHandlerRepo{}),
		performanceriskuc.NewDetailUseCase(performanceRiskHandlerRepo{}),
		performanceriskuc.NewUnlinkedUseCase(performanceRiskHandlerRepo{}),
		nil,
	)

	app := fiber.New()
	app.Get("/summary", func(c *fiber.Ctx) error {
		c.Locals(middleware.AccessScopeKey, &entity.AccessScope{
			UserID:           uuid.MustParse("33333333-3333-3333-3333-333333333333"),
			OrganizationID:   &ownOrg,
			AccessibleOrgIDs: []uuid.UUID{ownOrg},
		})
		return handler.Summary(c)
	})

	resp, err := app.Test(httptest.NewRequest("GET", "/summary?period=2026-H1&org_id="+otherOrg.String(), nil))
	if err != nil {
		t.Fatalf("app.Test error = %v", err)
	}
	if resp.StatusCode != 403 {
		t.Fatalf("status = %d, want 403", resp.StatusCode)
	}
}
