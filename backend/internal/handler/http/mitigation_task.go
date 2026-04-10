package http

import (
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
	generateTasksUC  *mtuc.GenerateTasksUseCase
	markOverdueUC    *mtuc.MarkOverdueUseCase
}

func NewMitigationTaskHandler(
	listUC *mtuc.ListTasksUseCase,
	submitProgressUC *mtuc.SubmitProgressUseCase,
	generateTasksUC *mtuc.GenerateTasksUseCase,
	markOverdueUC *mtuc.MarkOverdueUseCase,
) *MitigationTaskHandler {
	return &MitigationTaskHandler{
		listUC:           listUC,
		submitProgressUC: submitProgressUC,
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
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
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
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input := mtuc.ListTasksInput{OrgIDs: orgIDs}
	tasks, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if tasks == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": tasks})
}

// ListMyTasks handles GET /api/v1/mitigation-tasks/my
func (h *MitigationTaskHandler) ListMyTasks(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	orgIDs, ok := c.Locals("orgIds").([]uuid.UUID)
	if !ok || len(orgIDs) == 0 {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "no accessible organizations")
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
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
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
