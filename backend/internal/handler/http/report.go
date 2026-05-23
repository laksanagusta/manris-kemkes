package http

import (
	"errors"
	"fmt"

	"github.com/gofiber/fiber/v2"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/middleware"
	reportuc "github.com/manris/backend/internal/usecase/report"
)

type ReportHandler struct {
	generateUC  *reportuc.GenerateReportUseCase
	pdfRenderer service.ReportPDFRenderer
}

func NewReportHandler(generateUC *reportuc.GenerateReportUseCase, pdfRenderer service.ReportPDFRenderer) *ReportHandler {
	return &ReportHandler{
		generateUC:  generateUC,
		pdfRenderer: pdfRenderer,
	}
}

// GenerateRiskPDF handles GET /api/v1/reports/risk-pdf?cycle=YYYY-H1
func (h *ReportHandler) GenerateRiskPDF(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle query parameter is required")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	input := reportuc.GenerateReportInput{
		Cycle:  cycle,
		OrgIDs: orgIDs,
	}

	reportData, err := h.generateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	pdfBytes, err := h.pdfRenderer.Render(c.Context(), reportData)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Internal Server Error", "https://api.manris.com/errors/internal-server-error", fmt.Sprintf("failed to render PDF: %v", err))
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"risk-report-%s.pdf\"", cycle))
	return c.Send(pdfBytes)
}

var _ interface {
	GenerateRiskPDF(c *fiber.Ctx) error
} = &ReportHandler{}
