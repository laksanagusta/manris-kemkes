package http

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(parsed)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{parsed}
		}
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
