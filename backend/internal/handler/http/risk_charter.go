package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	riskcharteruc "github.com/manris/backend/internal/usecase/riskcharter"
)

type RiskCharterHandler struct {
	createUC *riskcharteruc.CreateRiskCharterUseCase
	getUC    *riskcharteruc.GetRiskCharterUseCase
	updateUC *riskcharteruc.UpdateRiskCharterUseCase
	listUC   *riskcharteruc.ListRiskChartersUseCase
}

func NewRiskCharterHandler(
	createUC *riskcharteruc.CreateRiskCharterUseCase,
	getUC *riskcharteruc.GetRiskCharterUseCase,
	updateUC *riskcharteruc.UpdateRiskCharterUseCase,
	listUC *riskcharteruc.ListRiskChartersUseCase,
) *RiskCharterHandler {
	return &RiskCharterHandler{
		createUC: createUC,
		getUC:    getUC,
		updateUC: updateUC,
		listUC:   listUC,
	}
}

func (h *RiskCharterHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	var organizationID *uuid.UUID
	if raw := c.Query("organization_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		organizationID = &parsed
	}

	result, err := h.listUC.Execute(c.Context(), riskcharteruc.ListRiskChartersInput{
		OrganizationID: organizationID,
		Period:         c.Query("period"),
		Page:           page,
		Limit:          limit,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}

func (h *RiskCharterHandler) Create(c *fiber.Ctx) error {
	var input riskcharteruc.CreateRiskCharterInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *RiskCharterHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk charter ID")
	}

	result, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
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
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
