package http

import (
	"context"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	reportuc "github.com/manris/backend/internal/usecase/report"
)

type quarterlyExecutorStub struct {
	inputs  []reportuc.QuarterlyReportInput
	updated *time.Time
	hash    string
}

func (s *quarterlyExecutorStub) Execute(_ context.Context, input reportuc.QuarterlyReportInput) (*entity.QuarterlyReportData, error) {
	s.inputs = append(s.inputs, input)
	return &entity.QuarterlyReportData{Cycle: input.Cycle, ComparisonCycle: input.ComparisonCycle, DataUpdatedAt: s.updated, SnapshotHash: s.hash}, nil
}

func TestQuarterlyPDFRejectsAChangedSnapshotHash(t *testing.T) {
	uc, pdf := &quarterlyExecutorStub{hash: "latest"}, &quarterlyPDFStub{}
	h := NewQuarterlyReportHandler(uc, pdf, nil)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{IsGlobal: true})
		return c.Next()
	})
	app.Get("/reports/quarterly-pdf", h.PDF)
	response, err := app.Test(httptest.NewRequest("GET", "/reports/quarterly-pdf?expected_snapshot_hash=stale", nil))
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != 409 || pdf.data != nil {
		t.Fatal("stale content hash must stop rendering")
	}
}

func TestQuarterlyPDFRejectsAChangedDisplayedDataset(t *testing.T) {
	updated := time.Date(2026, 9, 28, 10, 0, 0, 0, time.UTC)
	uc, pdf := &quarterlyExecutorStub{updated: &updated}, &quarterlyPDFStub{}
	h := NewQuarterlyReportHandler(uc, pdf, nil)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{IsGlobal: true})
		return c.Next()
	})
	app.Get("/reports/quarterly-pdf", h.PDF)
	for _, test := range []struct {
		expected string
		status   int
	}{
		{updated.Add(-time.Second).Format(time.RFC3339), 409},
		{"none", 409},
		{updated.In(time.FixedZone("WIB", 7*60*60)).Format(time.RFC3339Nano), 200},
	} {
		pdf.data = nil
		response, err := app.Test(httptest.NewRequest("GET", "/reports/quarterly-pdf?cycle=2026-Q2&expected_updated_at="+url.QueryEscape(test.expected), nil))
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != test.status || (test.status == 409 && pdf.data != nil) {
			t.Fatalf("changed source should stop export before rendering: %d %v", response.StatusCode, pdf.data)
		}
	}
}

type quarterlyPDFStub struct{ data *entity.QuarterlyReportData }

func (s *quarterlyPDFStub) RenderQuarterly(_ context.Context, data *entity.QuarterlyReportData) ([]byte, error) {
	s.data = data
	return []byte("%PDF-1.4 quarterly"), nil
}

func TestQuarterlyReportScopeAndExportUseIdenticalParameters(t *testing.T) {
	own, descendant, outside := uuid.New(), uuid.New(), uuid.New()
	for _, route := range []string{"/reports/quarterly", "/reports/quarterly-pdf"} {
		t.Run(route, func(t *testing.T) {
			uc, pdf := &quarterlyExecutorStub{}, &quarterlyPDFStub{}
			h := NewQuarterlyReportHandler(uc, pdf, nil)
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				c.Locals("accessScope", &entity.AccessScope{OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, descendant}})
				return c.Next()
			})
			app.Get("/reports/quarterly", h.Get)
			app.Get("/reports/quarterly-pdf", h.PDF)
			response, err := app.Test(httptest.NewRequest("GET", route+"?cycle=2026-Q2&compare_cycle=2025-Q4&org_id="+descendant.String(), nil))
			if err != nil {
				t.Fatal(err)
			}
			response.Body.Close()
			if response.StatusCode != 200 || len(uc.inputs) != 1 || uc.inputs[0].OrgIDs[0] != descendant || uc.inputs[0].ComparisonCycle != "2025-Q4" {
				t.Fatalf("scope or period lost: %d %+v", response.StatusCode, uc.inputs)
			}
			response, err = app.Test(httptest.NewRequest("GET", route+"?cycle=2026-Q2&org_id="+outside.String(), nil))
			if err != nil {
				t.Fatal(err)
			}
			response.Body.Close()
			if response.StatusCode != 403 || len(uc.inputs) != 1 {
				t.Fatalf("outside scope must fail before source fetch: %d %+v", response.StatusCode, uc.inputs)
			}
		})
	}
}

func TestQuarterlyReportRejectsMissingScopeAndEmptyCommaList(t *testing.T) {
	for _, raw := range []string{"", "?org_id=,,"} {
		uc := &quarterlyExecutorStub{}
		h := NewQuarterlyReportHandler(uc, &quarterlyPDFStub{}, nil)
		app := fiber.New()
		app.Get("/reports/quarterly", h.Get)
		response, err := app.Test(httptest.NewRequest("GET", "/reports/quarterly"+raw, nil))
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != 403 || len(uc.inputs) != 0 {
			t.Fatalf("missing scope cannot expand to global: %d", response.StatusCode)
		}
	}
	uc := &quarterlyExecutorStub{}
	h := NewQuarterlyReportHandler(uc, &quarterlyPDFStub{}, nil)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{IsGlobal: true})
		return c.Next()
	})
	app.Get("/reports/quarterly", h.Get)
	response, err := app.Test(httptest.NewRequest("GET", "/reports/quarterly?org_id=,,", nil))
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode < 400 || len(uc.inputs) != 0 {
		t.Fatal("blank comma filter must not become global")
	}
}

func TestQuarterlyReportRejectsEmptyOrInaccessibleGroup(t *testing.T) {
	own, outside := uuid.New(), uuid.New()
	for _, global := range []bool{false, true} {
		for _, ids := range [][]uuid.UUID{{}, {outside}} {
			if global && len(ids) > 0 {
				continue
			}
			uc := &quarterlyExecutorStub{}
			h := NewQuarterlyReportHandler(uc, &quarterlyPDFStub{}, reportOrgGroupResolverStub{orgIDs: ids})
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				c.Locals("accessScope", &entity.AccessScope{OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own}, IsGlobal: global})
				return c.Next()
			})
			app.Get("/reports/quarterly", h.Get)
			response, err := app.Test(httptest.NewRequest("GET", "/reports/quarterly?organization_group_id="+uuid.NewString(), nil))
			if err != nil {
				t.Fatal(err)
			}
			response.Body.Close()
			if response.StatusCode < 400 || len(uc.inputs) > 0 {
				t.Fatalf("group membership cannot broaden scope: %d %+v", response.StatusCode, uc.inputs)
			}
		}
	}
}
