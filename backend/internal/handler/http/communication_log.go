package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	commloguc "github.com/manris/backend/internal/usecase/communication_log"
)

type CommunicationLogHandler struct {
	createUC *commloguc.CreateCommunicationLogUseCase
	listUC   *commloguc.ListCommunicationLogsUseCase
	deleteUC *commloguc.DeleteCommunicationLogUseCase
}

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

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}
	var orgIDs []uuid.UUID
	if !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.createUC.Execute(c.Context(), commloguc.CreateCommunicationLogInput{
		RiskID:      riskID,
		Date:        input.Date,
		Method:      input.Method,
		Stakeholder: input.Stakeholder,
		Notes:       input.Notes,
		CreatedBy:   userID.String(),
		OrgIDs:      orgIDs,
	})

	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

func (h *CommunicationLogHandler) List(c *fiber.Ctx) error {
	riskID := c.Params("riskId")
	if riskID == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "risk ID is required")
	}

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}
	var orgIDs []uuid.UUID
	if !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.listUC.Execute(c.Context(), commloguc.ListCommunicationLogsInput{
		RiskID: riskID,
		OrgIDs: orgIDs,
	})

	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *CommunicationLogHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "communication log ID is required")
	}

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}
	var orgIDs []uuid.UUID
	if !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	err := h.deleteUC.Execute(c.Context(), commloguc.DeleteCommunicationLogInput{
		ID:     id,
		OrgIDs: orgIDs,
	})

	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"deletedAt": time.Now().Format(time.RFC3339)}})
}
