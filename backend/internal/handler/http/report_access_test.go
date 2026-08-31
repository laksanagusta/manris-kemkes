package http

import (
	"context"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	reportuc "github.com/manris/backend/internal/usecase/report"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type reportRiskRepoStub struct {
	*riskRegisterRepoStub
	lastCycle      string
	lastOrgIDs     []uuid.UUID
	lastListOrgIDs []uuid.UUID
}

func (r *reportRiskRepoStub) List(_ context.Context, orgIDs []uuid.UUID, _ string, _ string) ([]*entity.Risk, error) {
	r.lastListOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.Risk{}, nil
}

func (r *reportRiskRepoStub) ListCycleSnapshot(_ context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	r.lastCycle = cycle
	r.lastOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.Risk{
		{
			ID:              uuid.New(),
			Code:            "R-REPORT",
			Title:           "Report risk",
			Status:          entity.RiskStatusApproved,
			Category:        entity.RiskCategoryOperasional,
			Probability:     3,
			Impact:          4,
			AssessmentCycle: cycle,
		},
	}, nil
}

func (r *reportRiskRepoStub) ListApprovedRisks(_ context.Context, orgIDs []uuid.UUID, _ string) ([]*entity.Risk, error) {
	r.lastOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.Risk{}, nil
}

var _ repository.RiskRepository = (*reportRiskRepoStub)(nil)

type reportIncidentRepoStub struct{}

func (reportIncidentRepoStub) Create(context.Context, *entity.Incident) error { return nil }
func (reportIncidentRepoStub) GetByID(context.Context, string, []uuid.UUID) (*entity.Incident, error) {
	return nil, nil
}
func (reportIncidentRepoStub) Update(context.Context, *entity.Incident) error { return nil }
func (reportIncidentRepoStub) Delete(context.Context, string) error           { return nil }
func (reportIncidentRepoStub) List(context.Context, []uuid.UUID) ([]*entity.Incident, error) {
	return []*entity.Incident{}, nil
}
func (reportIncidentRepoStub) GetSummary(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return map[string]interface{}{}, nil
}

var _ repository.IncidentRepository = reportIncidentRepoStub{}

type reportPDFRendererStub struct{}

func (reportPDFRendererStub) Render(context.Context, *entity.ReportData) ([]byte, error) {
	return []byte("%PDF-1.4 test"), nil
}

type reportOrgGroupResolverStub struct {
	orgIDs []uuid.UUID
	err    error
}

func (s reportOrgGroupResolverStub) ResolveReportGroup(context.Context, uuid.UUID, *entity.AccessScope) ([]uuid.UUID, error) {
	return append([]uuid.UUID(nil), s.orgIDs...), s.err
}

func TestGenerateRiskPDFDefaultsToOwnOrgWhenOrgFilterMissing(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	riskRepo := &reportRiskRepoStub{riskRegisterRepoStub: &riskRegisterRepoStub{}}
	uc := reportuc.NewGenerateReportUseCase(riskRepo, reportIncidentRepoStub{})
	handler := NewReportHandler(uc, reportPDFRendererStub{}, nil)

	app := fiber.New()
	app.Get("/reports/risk-pdf", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RolePimpinan,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.GenerateRiskPDF)

	req := httptest.NewRequest(fiber.MethodGet, "/reports/risk-pdf?cycle=2026-H1", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(riskRepo.lastOrgIDs) != 1 || riskRepo.lastOrgIDs[0] != own {
		t.Fatalf("expected own-org-only PDF scope [%s], got %v", own, riskRepo.lastOrgIDs)
	}
}

func TestGenerateRiskPDFAllowsExplicitDescendantSelection(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	riskRepo := &reportRiskRepoStub{riskRegisterRepoStub: &riskRegisterRepoStub{}}
	uc := reportuc.NewGenerateReportUseCase(riskRepo, reportIncidentRepoStub{})
	handler := NewReportHandler(uc, reportPDFRendererStub{}, nil)

	app := fiber.New()
	app.Get("/reports/risk-pdf", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleReviewer,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.GenerateRiskPDF)

	req := httptest.NewRequest(fiber.MethodGet, "/reports/risk-pdf?cycle=2026-H1&org_id="+descendant.String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(riskRepo.lastOrgIDs) != 1 || riskRepo.lastOrgIDs[0] != descendant {
		t.Fatalf("expected descendant PDF scope [%s], got %v", descendant, riskRepo.lastOrgIDs)
	}
}

func TestListRisksAllowsExplicitDescendantSelectionOnReportSurface(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	riskRepo := &reportRiskRepoStub{riskRegisterRepoStub: &riskRegisterRepoStub{}}
	handler := &RiskHandler{listUC: riskuc.NewListRisksUseCase(riskRepo, nil)}

	app := fiber.New()
	app.Get("/risks", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleReviewer,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.ListRisks)

	req := httptest.NewRequest(fiber.MethodGet, "/risks?status=approved&org_id="+descendant.String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(riskRepo.lastListOrgIDs) != 1 || riskRepo.lastListOrgIDs[0] != descendant {
		t.Fatalf("expected descendant list scope [%s], got %v", descendant, riskRepo.lastListOrgIDs)
	}
}

func TestListApprovedRisksAllowsExplicitDescendantSelectionOnReportSurface(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	riskRepo := &reportRiskRepoStub{riskRegisterRepoStub: &riskRegisterRepoStub{}}
	handler := &RiskHandler{listApprovedUC: riskuc.NewListApprovedRisksUseCase(riskRepo, nil)}

	app := fiber.New()
	app.Get("/risks/trend", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RolePimpinan,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.ListApprovedRisks)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/trend?org_id="+descendant.String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(riskRepo.lastOrgIDs) != 1 || riskRepo.lastOrgIDs[0] != descendant {
		t.Fatalf("expected descendant trend scope [%s], got %v", descendant, riskRepo.lastOrgIDs)
	}
}

func TestGenerateRiskPDFAllowsOrganizationGroupSelection(t *testing.T) {
	own := uuid.New()
	member := uuid.New()
	riskRepo := &reportRiskRepoStub{riskRegisterRepoStub: &riskRegisterRepoStub{}}
	uc := reportuc.NewGenerateReportUseCase(riskRepo, reportIncidentRepoStub{})
	handler := NewReportHandler(uc, reportPDFRendererStub{}, reportOrgGroupResolverStub{orgIDs: []uuid.UUID{member}})

	app := fiber.New()
	app.Get("/reports/risk-pdf", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleReviewer,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, member},
		})
		return c.Next()
	}, handler.GenerateRiskPDF)

	req := httptest.NewRequest(fiber.MethodGet, "/reports/risk-pdf?cycle=2026-H1&organization_group_id="+uuid.New().String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}
	if len(riskRepo.lastOrgIDs) != 1 || riskRepo.lastOrgIDs[0] != member {
		t.Fatalf("expected group member scope [%s], got %v", member, riskRepo.lastOrgIDs)
	}
}
