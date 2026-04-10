package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	kruc "github.com/manris/backend/internal/usecase/kri_report"
)

type KRIReportHandler struct {
	listUC     *kruc.ListReportsUseCase
	submitUC   *kruc.SubmitReportUseCase
	acceptUC   *kruc.AcceptReportUseCase
	revisionUC *kruc.RequestRevisionUseCase
	skipUC     *kruc.SkipReportUseCase
	generateUC *kruc.GenerateReportsUseCase
	overdueUC  *kruc.MarkOverdueUseCase
}

func NewKRIReportHandler(
	listUC *kruc.ListReportsUseCase,
	submitUC *kruc.SubmitReportUseCase,
	acceptUC *kruc.AcceptReportUseCase,
	revisionUC *kruc.RequestRevisionUseCase,
	skipUC *kruc.SkipReportUseCase,
	generateUC *kruc.GenerateReportsUseCase,
	overdueUC *kruc.MarkOverdueUseCase,
) *KRIReportHandler {
	return &KRIReportHandler{
		listUC:     listUC,
		submitUC:   submitUC,
		acceptUC:   acceptUC,
		revisionUC: revisionUC,
		skipUC:     skipUC,
		generateUC: generateUC,
		overdueUC:  overdueUC,
	}
}

func (h *KRIReportHandler) ListByKRI(c *fiber.Ctx) error {
	kriID, err := uuid.Parse(c.Params("kriId"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid KRI ID")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input := kruc.ListReportsInput{KRIID: &kriID, OrgIDs: orgIDs}
	reports, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if reports == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": reports})
}

func (h *KRIReportHandler) ListMyReports(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	status := c.Query("status", "all")
	input := kruc.ListReportsInput{UserID: &userID, Status: status, OrgIDs: orgIDs}
	reports, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if reports == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": reports})
}

func (h *KRIReportHandler) ListReviewQueue(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input := kruc.ListReportsInput{Status: "submitted", OrgIDs: orgIDs}
	reports, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if reports == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": reports})
}

func (h *KRIReportHandler) SubmitReport(c *fiber.Ctx) error {
	reportID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid report ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	var input kruc.SubmitReportInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ReportID = reportID
	input.SubmittedBy = userID
	input.OrgIDs = orgIDs

	report, err := h.submitUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": report})
}

func (h *KRIReportHandler) AcceptReport(c *fiber.Ctx) error {
	reportID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid report ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	var body struct {
		ReviewNote string `json:"review_note"`
	}
	_ = c.BodyParser(&body)

	report, err := h.acceptUC.Execute(c.Context(), kruc.AcceptReportInput{
		ReportID:   reportID,
		ReviewedBy: userID,
		ReviewNote: body.ReviewNote,
		OrgIDs:     orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": report})
}

func (h *KRIReportHandler) RequestRevision(c *fiber.Ctx) error {
	reportID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid report ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	var input kruc.RequestRevisionInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ReportID = reportID
	input.ReviewedBy = userID
	input.OrgIDs = orgIDs

	report, err := h.revisionUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": report})
}

func (h *KRIReportHandler) SkipReport(c *fiber.Ctx) error {
	reportID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid report ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	var input kruc.SkipReportInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ReportID = reportID
	input.SubmittedBy = userID
	input.OrgIDs = orgIDs

	report, err := h.skipUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": report})
}

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
