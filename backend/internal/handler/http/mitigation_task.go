package http

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

// MitigationTaskHandler handles HTTP requests for mitigation task operations
type MitigationTaskHandler struct {
	listUC           *mtuc.ListTasksUseCase
	submitProgressUC *mtuc.SubmitProgressUseCase
	submitReportUC   *mtuc.SubmitMonitoringReportUseCase
	generateTasksUC  *mtuc.GenerateTasksUseCase
	markOverdueUC    *mtuc.MarkOverdueUseCase
}

func NewMitigationTaskHandler(
	listUC *mtuc.ListTasksUseCase,
	submitProgressUC *mtuc.SubmitProgressUseCase,
	submitReportUC *mtuc.SubmitMonitoringReportUseCase,
	generateTasksUC *mtuc.GenerateTasksUseCase,
	markOverdueUC *mtuc.MarkOverdueUseCase,
) *MitigationTaskHandler {
	return &MitigationTaskHandler{
		listUC:           listUC,
		submitProgressUC: submitProgressUC,
		submitReportUC:   submitReportUC,
		generateTasksUC:  generateTasksUC,
		markOverdueUC:    markOverdueUC,
	}
}

// ListByRisk handles GET /api/v1/risks/:riskId/tasks
func (h *MitigationTaskHandler) ListByRisk(c *fiber.Ctx) error {
	riskID, err := uuid.Parse(c.Params("riskId"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	input := mtuc.ListTasksInput{RiskID: &riskID, OrgIDs: orgIDs}
	tasks, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if tasks == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": tasks})
}

// ListAll handles GET /api/v1/mitigation-tasks/all (compliance monitoring dashboard)
func (h *MitigationTaskHandler) ListAll(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	input := mtuc.ListTasksInput{
		OrgIDs: orgIDs,
		Query:  strings.TrimSpace(c.Query("q")),
		Page:   page,
		Limit:  limit,
	}
	result, err := h.listUC.ExecutePaginated(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data":  result.Data,
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

// ListMyTasks handles GET /api/v1/mitigation-tasks/my
func (h *MitigationTaskHandler) ListMyTasks(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	status := c.Query("status", "all")
	input := mtuc.ListTasksInput{UserID: &userID, Status: status, OrgIDs: orgIDs}
	tasks, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if tasks == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": tasks})
}

// SubmitProgress handles POST /api/v1/mitigation-tasks/:id/submit
func (h *MitigationTaskHandler) SubmitProgress(c *fiber.Ctx) error {
	taskID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid task ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	var input mtuc.SubmitProgressInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.TaskID = taskID
	input.ReportedBy = userID
	input.OrgIDs = orgIDs

	task, err := h.submitProgressUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": task})
}

// SubmitReport handles PUT /api/mitigation-tasks/:id/report
func (h *MitigationTaskHandler) SubmitReport(c *fiber.Ctx) error {
	taskID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid task ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	var input mtuc.SubmitMonitoringReportInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.TaskID = taskID
	input.ReportedBy = userID
	input.OrgIDs = orgIDs

	task, err := h.submitReportUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": task})
}

// TriggerGenerate handles POST /api/v1/mitigation-tasks/generate (admin/cron trigger)
func (h *MitigationTaskHandler) TriggerGenerate(c *fiber.Ctx) error {
	dateStr := c.Query("date")
	now := time.Now()
	if dateStr != "" {
		if parsedTime, err := time.Parse("2006-01-02", dateStr); err == nil {
			now = parsedTime
		}
	}

	created, err := h.generateTasksUC.Execute(c.Context(), now)
	if err != nil {
		return handleError(c, err)
	}

	marked, _ := h.markOverdueUC.Execute(c.Context(), now)

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"tasksGenerated": created,
			"tasksOverdue":   marked,
		},
	})
}

// ListByMonitoring handles GET /api/risk-monitorings/:id/tasks
func (h *MitigationTaskHandler) ListByMonitoring(c *fiber.Ctx) error {
	monitoringID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid monitoring ID")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	tasks, err := h.listUC.ListByMonitoring(c.Context(), monitoringID, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	if tasks == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": tasks})
}

// ValidateFinalize handles GET /api/risk-monitorings/:id/validate-finalize
func (h *MitigationTaskHandler) ValidateFinalize(c *fiber.Ctx) error {
	monitoringID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid monitoring ID")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	counts, err := h.listUC.CountByMonitoring(c.Context(), monitoringID, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"canFinalize":   counts.Pending == 0,
			"totalTasks":    counts.Total,
			"reportedTasks": counts.Done,
			"pendingTasks":  counts.Pending,
		},
	})
}
