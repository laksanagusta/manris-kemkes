package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	riskobjectiveuc "github.com/manris/backend/internal/usecase/riskobjective"
)

type RiskObjectiveHandler struct {
	createUC *riskobjectiveuc.CreateRiskObjectiveUseCase
	getUC    *riskobjectiveuc.GetRiskObjectiveUseCase
	updateUC *riskobjectiveuc.UpdateRiskObjectiveUseCase
	deleteUC *riskobjectiveuc.DeleteRiskObjectiveUseCase
	listUC   *riskobjectiveuc.ListRiskObjectivesUseCase
}

func NewRiskObjectiveHandler(
	createUC *riskobjectiveuc.CreateRiskObjectiveUseCase,
	getUC *riskobjectiveuc.GetRiskObjectiveUseCase,
	updateUC *riskobjectiveuc.UpdateRiskObjectiveUseCase,
	deleteUC *riskobjectiveuc.DeleteRiskObjectiveUseCase,
	listUC *riskobjectiveuc.ListRiskObjectivesUseCase,
) *RiskObjectiveHandler {
	return &RiskObjectiveHandler{
		createUC: createUC,
		getUC:    getUC,
		updateUC: updateUC,
		deleteUC: deleteUC,
		listUC:   listUC,
	}
}

func (h *RiskObjectiveHandler) List(c *fiber.Ctx) error {
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

	result, err := h.listUC.Execute(c.Context(), riskobjectiveuc.ListRiskObjectivesInput{
		OrganizationID: organizationID,
		Period:         c.Query("period"),
		Q:              c.Query("q"),
		Page:           page,
		Limit:          limit,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}

func (h *RiskObjectiveHandler) Create(c *fiber.Ctx) error {
	var input riskobjectiveuc.CreateRiskObjectiveInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *RiskObjectiveHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk objective ID")
	}

	result, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
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
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskObjectiveHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk objective ID")
	}

	if err := h.deleteUC.Execute(c.Context(), id); err != nil {
		return handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}