package http

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/service"
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

	// Optional org ID filter from query param
	var orgID *uuid.UUID
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		orgID = &parsed
	}

	input := reportuc.GenerateReportInput{
		Cycle: cycle,
		OrgID: orgID,
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
