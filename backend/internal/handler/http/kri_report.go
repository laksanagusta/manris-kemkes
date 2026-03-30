package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	kruc "github.com/manris/backend/internal/usecase/kri_report"
)

// KRIReportHandler handles HTTP requests for KRI report operations
type KRIReportHandler struct {
	listUC     *kruc.ListReportsUseCase
	submitUC   *kruc.SubmitReportUseCase
	generateUC *kruc.GenerateReportsUseCase
	overdueUC  *kruc.MarkOverdueUseCase
}

func NewKRIReportHandler(
	listUC *kruc.ListReportsUseCase,
	submitUC *kruc.SubmitReportUseCase,
	generateUC *kruc.GenerateReportsUseCase,
	overdueUC *kruc.MarkOverdueUseCase,
) *KRIReportHandler {
	return &KRIReportHandler{
		listUC:     listUC,
		submitUC:   submitUC,
		generateUC: generateUC,
		overdueUC:  overdueUC,
	}
}

// ListByKRI handles GET /api/v1/kris/:kriId/reports
func (h *KRIReportHandler) ListByKRI(c *fiber.Ctx) error {
	kriID, err := uuid.Parse(c.Params("kriId"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid KRI ID")
	}

	input := kruc.ListReportsInput{KRIID: &kriID}
	reports, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if reports == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": reports})
}

// ListMyReports handles GET /api/v1/kri-reports/my
func (h *KRIReportHandler) ListMyReports(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	status := c.Query("status", "all")
	input := kruc.ListReportsInput{UserID: &userID, Status: status}
	reports, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if reports == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": reports})
}

// SubmitReport handles POST /api/v1/kri-reports/:id/submit
func (h *KRIReportHandler) SubmitReport(c *fiber.Ctx) error {
	reportID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid report ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	var input kruc.SubmitReportInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ReportID = reportID
	input.SubmittedBy = userID

	report, err := h.submitUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": report})
}

// TriggerGenerate handles POST /api/v1/kri-reports/generate (admin/cron trigger)
func (h *KRIReportHandler) TriggerGenerate(c *fiber.Ctx) error {
	dateStr := c.Query("date")
	now := time.Now()
	if dateStr != "" {
		if parsedTime, err := time.Parse("2006-01-02", dateStr); err == nil {
			now = parsedTime
		}
	}

	created, err := h.generateUC.Execute(c.Context(), now)
	if err != nil {
		return handleError(c, err)
	}

	marked, _ := h.overdueUC.Execute(c.Context(), now)

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"reportsGenerated": created,
			"reportsOverdue":   marked,
		},
	})
}
