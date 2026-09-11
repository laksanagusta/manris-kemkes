package http

import (
	"context"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
	riskcharteruc "github.com/manris/backend/internal/usecase/riskcharter"
)

type RiskCharterHandler struct {
	createUC *riskcharteruc.CreateRiskCharterUseCase
	getUC    *riskcharteruc.GetRiskCharterUseCase
	updateUC *riskcharteruc.UpdateRiskCharterUseCase
	listUC   *riskcharteruc.ListRiskChartersUseCase
	workflow *riskcharteruc.WorkflowUseCase
}

func NewRiskCharterHandler(
	createUC *riskcharteruc.CreateRiskCharterUseCase,
	getUC *riskcharteruc.GetRiskCharterUseCase,
	updateUC *riskcharteruc.UpdateRiskCharterUseCase,
	listUC *riskcharteruc.ListRiskChartersUseCase,
	workflow *riskcharteruc.WorkflowUseCase,
) *RiskCharterHandler {
	return &RiskCharterHandler{
		createUC: createUC,
		getUC:    getUC,
		updateUC: updateUC,
		listUC:   listUC,
		workflow: workflow,
	}
}

func (h *RiskCharterHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	var organizationID *uuid.UUID
	if raw := c.Query("organization_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
		}
		organizationID = &parsed
	}

	result, err := h.listUC.Execute(c.Context(), riskcharteruc.ListRiskChartersInput{
		OrganizationID: organizationID,
		Period:         c.Query("period"),
		Query:          c.Query("q"),
		Page:           page,
		Limit:          limit,
		Scope:          middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}

func (h *RiskCharterHandler) Create(c *fiber.Ctx) error {
	var input riskcharteruc.CreateRiskCharterInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	input.Scope = middleware.GetAccessScope(c)
	actor, ok := c.Locals("userId").(uuid.UUID)
	if !ok || actor == uuid.Nil {
		return sendProblemDetails(c, 401, "Tidak Terautentikasi", "https://api.manris.com/errors/unauthorized", "identitas pengguna tidak tersedia")
	}
	input.CreatedBy = actor
	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	status := fiber.StatusCreated
	if result.Existing {
		status = fiber.StatusOK
	}
	return c.Status(status).JSON(result)
}

func (h *RiskCharterHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID piagam risiko tidak valid")
	}

	result, err := h.getUC.Execute(c.Context(), riskcharteruc.GetRiskCharterInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskCharterHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID piagam risiko tidak valid")
	}

	var input riskcharteruc.UpdateRiskCharterInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}
	input.ID = id
	input.AccessScope = middleware.GetAccessScope(c)

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskCharterHandler) Finalize(c *fiber.Ctx) error {
	input, err := riskCharterActionInput(c)
	if err != nil {
		return err
	}
	result, executeErr := h.workflow.Finalize(c.Context(), input)
	if executeErr != nil {
		return handleError(c, executeErr)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskCharterHandler) CreateRevision(c *fiber.Ctx) error {
	input, err := riskCharterActionInput(c)
	if err != nil {
		return err
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&body); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}
	result, executeErr := h.workflow.CreateRevision(c.Context(), riskcharteruc.CreateRevisionInput{
		CharterActionInput: input,
		Reason:             body.Reason,
	})
	if executeErr != nil {
		return handleError(c, executeErr)
	}
	status := fiber.StatusCreated
	if result.Existing {
		status = fiber.StatusOK
	}
	return c.Status(status).JSON(result)
}

func (h *RiskCharterHandler) ListVersions(c *fiber.Ctx) error {
	input, err := riskCharterActionInput(c)
	if err != nil {
		return err
	}
	result, executeErr := h.workflow.ListVersions(c.Context(), input)
	if executeErr != nil {
		return handleError(c, executeErr)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskCharterHandler) Archive(c *fiber.Ctx) error {
	return h.runAction(c, h.workflow.Archive)
}

func (h *RiskCharterHandler) Restore(c *fiber.Ctx) error {
	return h.runAction(c, h.workflow.Restore)
}

func (h *RiskCharterHandler) DeleteDraft(c *fiber.Ctx) error {
	input, err := riskCharterActionInput(c)
	if err != nil {
		return err
	}
	if executeErr := h.workflow.DeleteDraft(c.Context(), input); executeErr != nil {
		return handleError(c, executeErr)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *RiskCharterHandler) runAction(
	c *fiber.Ctx,
	action func(context.Context, riskcharteruc.CharterActionInput) (*entity.RiskCharter, error),
) error {
	input, err := riskCharterActionInput(c)
	if err != nil {
		return err
	}
	result, executeErr := action(c.Context(), input)
	if executeErr != nil {
		return handleError(c, executeErr)
	}
	return c.JSON(fiber.Map{"data": result})
}

func riskCharterActionInput(c *fiber.Ctx) (riskcharteruc.CharterActionInput, error) {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return riskcharteruc.CharterActionInput{}, sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID piagam risiko tidak valid")
	}
	actor, ok := c.Locals("userId").(uuid.UUID)
	if !ok || actor == uuid.Nil {
		return riskcharteruc.CharterActionInput{}, sendProblemDetails(c, 401, "Tidak Terautentikasi", "https://api.manris.com/errors/unauthorized", "identitas pengguna tidak tersedia")
	}
	return riskcharteruc.CharterActionInput{
		ID:    id,
		Actor: actor,
		Scope: middleware.GetAccessScope(c),
	}, nil
}
