package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	riskcharteruc "github.com/manris/backend/internal/usecase/riskcharter"
)

type RiskCharterHandler struct {
	createUC *riskcharteruc.CreateRiskCharterUseCase
	getUC    *riskcharteruc.GetRiskCharterUseCase
	updateUC *riskcharteruc.UpdateRiskCharterUseCase
	listUC   *riskcharteruc.ListRiskChartersUseCase
}

func NewRiskCharterHandler(createUC *riskcharteruc.CreateRiskCharterUseCase, getUC *riskcharteruc.GetRiskCharterUseCase, updateUC *riskcharteruc.UpdateRiskCharterUseCase, listUC *riskcharteruc.ListRiskChartersUseCase) *RiskCharterHandler {
	return &RiskCharterHandler{createUC: createUC, getUC: getUC, updateUC: updateUC, listUC: listUC}
}

func (h *RiskCharterHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	period := c.Query("period")
	status := c.Query("status")
	orgIDStr := c.Query("organizationId")
	var orgID *uuid.UUID
	if orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		orgID = &parsed
	}
	result, err := h.listUC.Execute(c.Context(), riskcharteruc.ListRiskChartersInput{OrganizationID: orgID, Period: period, Status: status, Page: page, Limit: limit})
	if err != nil {
		return handleRiskCharterError(c, err)
	}
	return c.JSON(result)
}

func (h *RiskCharterHandler) Create(c *fiber.Ctx) error {
	var input riskcharteruc.CreateRiskCharterInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	if userID, ok := c.Locals("userId").(uuid.UUID); ok {
		input.CreatedBy = &userID
	}
	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleRiskCharterError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"data": result})
}

func (h *RiskCharterHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk charter ID")
	}
	result, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleRiskCharterError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskCharterHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk charter ID")
	}
	var input riskcharteruc.UpdateRiskCharterInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.ID = id
	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleRiskCharterError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func handleRiskCharterError(c *fiber.Ctx, err error) error {
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
