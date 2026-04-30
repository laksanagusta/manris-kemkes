package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	riskobjectiveuc "github.com/manris/backend/internal/usecase/riskobjective"
)

type RiskObjectiveHandler struct {
	createUC *riskobjectiveuc.CreateRiskObjectiveUseCase
	getUC    *riskobjectiveuc.GetRiskObjectiveUseCase
	updateUC *riskobjectiveuc.UpdateRiskObjectiveUseCase
	deleteUC *riskobjectiveuc.DeleteRiskObjectiveUseCase
	listUC   *riskobjectiveuc.ListRiskObjectivesUseCase
}

func NewRiskObjectiveHandler(createUC *riskobjectiveuc.CreateRiskObjectiveUseCase, getUC *riskobjectiveuc.GetRiskObjectiveUseCase, updateUC *riskobjectiveuc.UpdateRiskObjectiveUseCase, deleteUC *riskobjectiveuc.DeleteRiskObjectiveUseCase, listUC *riskobjectiveuc.ListRiskObjectivesUseCase) *RiskObjectiveHandler {
	return &RiskObjectiveHandler{createUC: createUC, getUC: getUC, updateUC: updateUC, deleteUC: deleteUC, listUC: listUC}
}

func (h *RiskObjectiveHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	q := c.Query("q")
	period := c.Query("period")
	orgIDStr := c.Query("organizationId")
	var orgID *uuid.UUID
	if orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		orgID = &parsed
	}
	result, err := h.listUC.Execute(c.Context(), riskobjectiveuc.ListRiskObjectivesInput{OrganizationID: orgID, Period: period, Q: q, Page: page, Limit: limit})
	if err != nil {
		return handleRiskObjectiveError(c, err)
	}
	return c.JSON(result)
}

func (h *RiskObjectiveHandler) Create(c *fiber.Ctx) error {
	var input riskobjectiveuc.CreateRiskObjectiveInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	if userID, ok := c.Locals("userId").(uuid.UUID); ok {
		input.CreatedBy = &userID
	}
	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleRiskObjectiveError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"data": result})
}

func (h *RiskObjectiveHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk objective ID")
	}
	result, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleRiskObjectiveError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskObjectiveHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk objective ID")
	}
	var input riskobjectiveuc.UpdateRiskObjectiveInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.ID = id
	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleRiskObjectiveError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskObjectiveHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk objective ID")
	}
	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleRiskObjectiveError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func handleRiskObjectiveError(c *fiber.Ctx, err error) error {
	switch {
	case errors.IsNotFound(err):
		return sendProblemDetails(c, fiber.StatusNotFound, "Not Found", "https://api.manris.com/errors/not-found", err.Error())
	case errors.IsValidation(err):
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/validation", err.Error())
	case errors.IsForbidden(err):
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", err.Error())
	default:
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Server Error", "https://api.manris.com/errors/server-error", err.Error())
	}
}
