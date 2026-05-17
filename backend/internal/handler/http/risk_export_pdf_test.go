package http

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type stubRiskExportPDFUseCase struct {
	result *riskuc.ExportRiskPDFResult
	err    error
}

func (s *stubRiskExportPDFUseCase) Execute(context.Context, riskuc.ExportRiskPDFInput) (*riskuc.ExportRiskPDFResult, error) {
	return s.result, s.err
}

func TestRiskHandler_ExportRiskPDF(t *testing.T) {
	app := fiber.New()
	handler := &RiskHandler{
		exportPDFUC: &stubRiskExportPDFUseCase{
			result: &riskuc.ExportRiskPDFResult{
				Filename: "lampiran-risiko-R-001.pdf",
				Bytes:    []byte("%PDF-1.4 fake"),
			},
		},
	}

	app.Get("/risks/:id/export-pdf", handler.ExportRiskPDF)
	req := httptest.NewRequest(fiber.MethodGet, "/risks/"+uuid.NewString()+"/export-pdf", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
	if got := resp.Header.Get("Content-Type"); got != "application/pdf" {
		t.Fatalf("Content-Type = %q, want %q", got, "application/pdf")
	}
}
