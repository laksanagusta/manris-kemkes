package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	kriuc "github.com/manris/backend/internal/usecase/kri"
)

// KRIHandler handles HTTP requests for KRI operations using clean architecture
type KRIHandler struct {
	createUC    *kriuc.CreateKRIUseCase
	getUC       *kriuc.GetKRIUseCase
	updateUC    *kriuc.UpdateKRIUseCase
	deleteUC    *kriuc.DeleteKRIUseCase
	listUC      *kriuc.ListKRIsUseCase
	dashboardUC *kriuc.KRIDashboardUseCase
}

func NewKRIHandler(
	createUC *kriuc.CreateKRIUseCase,
	getUC *kriuc.GetKRIUseCase,
	updateUC *kriuc.UpdateKRIUseCase,
	deleteUC *kriuc.DeleteKRIUseCase,
	listUC *kriuc.ListKRIsUseCase,
	dashboardUC *kriuc.KRIDashboardUseCase,
) *KRIHandler {
	return &KRIHandler{
		createUC:    createUC,
		getUC:       getUC,
		updateUC:    updateUC,
		deleteUC:    deleteUC,
		listUC:      listUC,
		dashboardUC: dashboardUC,
	}
}

// CreateKRI handles POST /api/kris
func (h *KRIHandler) CreateKRI(c *fiber.Ctx) error {
	var input kriuc.CreateKRIInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	// Parse risk_id (required)
	if riskIDStr := c.Query("risk_id"); riskIDStr != "" {
		riskID, err := uuid.Parse(riskIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
		}
		input.RiskID = riskID
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

// GetKRI handles GET /api/kris/:id
func (h *KRIHandler) GetKRI(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid KRI ID")
	}

	kri, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": kri})
}

// UpdateKRI handles PUT /api/kris/:id
func (h *KRIHandler) UpdateKRI(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid KRI ID")
	}

	var input kriuc.UpdateKRIInput
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

// DeleteKRI handles DELETE /api/kris/:id
func (h *KRIHandler) DeleteKRI(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid KRI ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListKRIs handles GET /api/kris
func (h *KRIHandler) ListKRIs(c *fiber.Ctx) error {
	var input kriuc.ListKRIsInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

	kris, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if kris == nil {
		kris = []*entity.KRI{}
	}
	return c.JSON(fiber.Map{"data": kris})
}

// KRIDashboard handles GET /api/kris/dashboard
func (h *KRIHandler) KRIDashboard(c *fiber.Ctx) error {
	var input kriuc.KRIDashboardInput

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
