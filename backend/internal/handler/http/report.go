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
	generateUC    *reportuc.GenerateReportUseCase
	pdfRenderer   service.ReportPDFRenderer
	groupResolver organizationGroupReportResolver
}

func NewReportHandler(generateUC *reportuc.GenerateReportUseCase, pdfRenderer service.ReportPDFRenderer, groupResolver organizationGroupReportResolver) *ReportHandler {
	return &ReportHandler{
		generateUC:    generateUC,
		pdfRenderer:   pdfRenderer,
		groupResolver: groupResolver,
	}
}

// GenerateRiskPDF handles GET /api/v1/reports/risk-pdf?cycle=YYYY-H1
func (h *ReportHandler) GenerateRiskPDF(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "parameter kueri cycle wajib diisi")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReportOrgIDsFromQuery(c.Context(), scope, c.Query("org_id"), c.Query("organization_group_id"), h.groupResolver)
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		if errors.Is(err, domainerrors.ErrInvalidInput) {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id dan organization_group_id tidak dapat digunakan bersamaan")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Kesalahan Server Internal", "https://api.manris.com/errors/internal-server-error", fmt.Sprintf("gagal merender PDF: %v", err))
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"risk-report-%s.pdf\"", cycle))
	return c.Send(pdfBytes)
}

var _ interface {
	GenerateRiskPDF(c *fiber.Ctx) error
} = &ReportHandler{}
