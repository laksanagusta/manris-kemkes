package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	commloguc "github.com/manris/backend/internal/usecase/communication_log"
)

// CommunicationLogHandler handles HTTP requests for Communication Log operations
type CommunicationLogHandler struct {
	createUC *commloguc.CreateCommunicationLogUseCase
	listUC   *commloguc.ListCommunicationLogsUseCase
	deleteUC *commloguc.DeleteCommunicationLogUseCase
}

// NewCommunicationLogHandler creates a new communication log handler
func NewCommunicationLogHandler(
	createUC *commloguc.CreateCommunicationLogUseCase,
	listUC *commloguc.ListCommunicationLogsUseCase,
	deleteUC *commloguc.DeleteCommunicationLogUseCase,
) *CommunicationLogHandler {
	return &CommunicationLogHandler{
		createUC: createUC,
		listUC:   listUC,
		deleteUC: deleteUC,
	}
}

// Create handles POST /api/v1/risks/:riskId/communication-logs
func (h *CommunicationLogHandler) Create(c *fiber.Ctx) error {
	riskID := c.Params("riskId")
	if riskID == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "risk ID is required")
	}

	var input struct {
		Date        string `json:"date"`
		Method      string `json:"method"`
		Stakeholder string `json:"stakeholder"`
		Notes       string `json:"notes"`
	}

	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	// Get user info from context (set by auth middleware)
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	result, err := h.createUC.Execute(c.Context(), commloguc.CreateCommunicationLogInput{
		RiskID:      riskID,
		Date:        input.Date,
		Method:      input.Method,
		Stakeholder: input.Stakeholder,
		Notes:       input.Notes,
		CreatedBy:   userID.String(),
	})

	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// List handles GET /api/v1/risks/:riskId/communication-logs
func (h *CommunicationLogHandler) List(c *fiber.Ctx) error {
	riskID := c.Params("riskId")
	if riskID == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "risk ID is required")
	}

	result, err := h.listUC.Execute(c.Context(), commloguc.ListCommunicationLogsInput{
		RiskID: riskID,
	})

	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// Delete handles DELETE /api/v1/communication-logs/:id
func (h *CommunicationLogHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "communication log ID is required")
	}

	err := h.deleteUC.Execute(c.Context(), commloguc.DeleteCommunicationLogInput{
		ID: id,
	})

	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"deletedAt": time.Now().Format(time.RFC3339)}})
}
