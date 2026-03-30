package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	controluc "github.com/manris/backend/internal/usecase/control"
)

// ControlHandler handles HTTP requests for Control operations using clean architecture
type ControlHandler struct {
	createUC    *controluc.CreateControlUseCase
	getUC       *controluc.GetControlUseCase
	updateUC    *controluc.UpdateControlUseCase
	deleteUC    *controluc.DeleteControlUseCase
	listUC      *controluc.ListControlsUseCase
	dashboardUC *controluc.ControlDashboardUseCase
}

func NewControlHandler(
	createUC *controluc.CreateControlUseCase,
	getUC *controluc.GetControlUseCase,
	updateUC *controluc.UpdateControlUseCase,
	deleteUC *controluc.DeleteControlUseCase,
	listUC *controluc.ListControlsUseCase,
	dashboardUC *controluc.ControlDashboardUseCase,
) *ControlHandler {
	return &ControlHandler{
		createUC:    createUC,
		getUC:       getUC,
		updateUC:    updateUC,
		deleteUC:    deleteUC,
		listUC:      listUC,
		dashboardUC: dashboardUC,
	}
}

// CreateControl handles POST /api/controls
func (h *ControlHandler) CreateControl(c *fiber.Ctx) error {
	var input controluc.CreateControlInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	// Parse risk_id if provided
	if riskIDStr := c.Query("risk_id"); riskIDStr != "" {
		riskID, err := uuid.Parse(riskIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
		}
		input.RiskID = &riskID
	}

	// Parse organization_id if provided
	if orgIDStr := c.Query("organization_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrganizationID = &orgID
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetControl handles GET /api/controls/:id
func (h *ControlHandler) GetControl(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid control ID")
	}

	control, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": control})
}

// UpdateControl handles PUT /api/controls/:id
func (h *ControlHandler) UpdateControl(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid control ID")
	}

	var input controluc.UpdateControlInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ID = id

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// DeleteControl handles DELETE /api/controls/:id
func (h *ControlHandler) DeleteControl(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid control ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListControls handles GET /api/controls
func (h *ControlHandler) ListControls(c *fiber.Ctx) error {
	var input controluc.ListControlsInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

	controls, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if controls == nil {
		controls = []*entity.Control{}
	}
	return c.JSON(fiber.Map{"data": controls})
}

// ControlDashboard handles GET /api/controls/dashboard
func (h *ControlHandler) ControlDashboard(c *fiber.Ctx) error {
	var input controluc.ControlDashboardInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

	metrics, err := h.dashboardUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": metrics})
}
