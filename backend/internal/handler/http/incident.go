package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	incidentuc "github.com/manris/backend/internal/usecase/incident"
)

// IncidentHandler handles HTTP requests for Incident operations using clean architecture
type IncidentHandler struct {
	createUC      *incidentuc.CreateIncidentUseCase
	createBatchUC *incidentuc.CreateIncidentBatchUseCase
	getUC         *incidentuc.GetIncidentUseCase
	updateUC      *incidentuc.UpdateIncidentUseCase
	deleteUC      *incidentuc.DeleteIncidentUseCase
	listUC        *incidentuc.ListIncidentsUseCase
	summaryUC     *incidentuc.GetIncidentSummaryUseCase
}

func NewIncidentHandler(
	createUC *incidentuc.CreateIncidentUseCase,
	createBatchUC *incidentuc.CreateIncidentBatchUseCase,
	getUC *incidentuc.GetIncidentUseCase,
	updateUC *incidentuc.UpdateIncidentUseCase,
	deleteUC *incidentuc.DeleteIncidentUseCase,
	listUC *incidentuc.ListIncidentsUseCase,
	summaryUC *incidentuc.GetIncidentSummaryUseCase,
) *IncidentHandler {
	return &IncidentHandler{
		createUC:      createUC,
		createBatchUC: createBatchUC,
		getUC:         getUC,
		updateUC:      updateUC,
		deleteUC:      deleteUC,
		listUC:        listUC,
		summaryUC:     summaryUC,
	}
}

// CreateIncident handles POST /api/incidents
func (h *IncidentHandler) CreateIncident(c *fiber.Ctx) error {
	var input incidentuc.CreateIncidentInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	// Get user ID from context (set by auth middleware)
	// Note: middleware sets "userId" (camelCase)
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}
	input.ReporterID = &userID

	// Parse linked_risk_id if provided
	if riskIDStr := c.Query("linked_risk_id"); riskIDStr != "" {
		riskID, err := uuid.Parse(riskIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid linked risk ID")
		}
		input.LinkedRiskIDs = append(input.LinkedRiskIDs, riskID.String())
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

type createIncidentBatchRequest struct {
	Items []incidentuc.CreateIncidentBatchItemInput `json:"items"`
}

// CreateIncidentBatch handles POST /api/incidents/batch
func (h *IncidentHandler) CreateIncidentBatch(c *fiber.Ctx) error {
	var req createIncidentBatchRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}

	result, err := h.createBatchUC.Execute(c.Context(), incidentuc.CreateIncidentBatchInput{
		Items:      req.Items,
		ReporterID: &userID,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetIncident handles GET /api/incidents/:id
func (h *IncidentHandler) GetIncident(c *fiber.Ctx) error {
	id := c.Params("id")

	incident, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": incident})
}

// UpdateIncident handles PUT /api/incidents/:id
func (h *IncidentHandler) UpdateIncident(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid incident ID")
	}

	var input incidentuc.UpdateIncidentInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ID = id

	if riskIDStr := c.Query("linked_risk_id"); riskIDStr != "" {
		riskID, err := uuid.Parse(riskIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid linked risk ID")
		}
		input.LinkedRiskIDs = append(input.LinkedRiskIDs, riskID.String())
	}

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// DeleteIncident handles DELETE /api/incidents/:id
func (h *IncidentHandler) DeleteIncident(c *fiber.Ctx) error {
	id := c.Params("id")

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListIncidents handles GET /api/incidents
func (h *IncidentHandler) ListIncidents(c *fiber.Ctx) error {
	var orgID *uuid.UUID

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		parsedID, err := uuid.Parse(orgIDStr)
		if err == nil {
			orgID = &parsedID
		}
	}

	input := incidentuc.ListIncidentsInput{
		OrgID: orgID,
	}

	incidents, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if incidents == nil {
		incidents = []*entity.Incident{}
	}
	return c.JSON(fiber.Map{"data": incidents})
}

// GetSummary handles GET /api/incidents/summary
func (h *IncidentHandler) GetSummary(c *fiber.Ctx) error {
	result, err := h.summaryUC.Execute(c.Context(), incidentuc.GetIncidentSummaryInput{
		OrgID: c.Query("org_id"),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
