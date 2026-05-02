package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	tmpmruc "github.com/manris/backend/internal/usecase/tmpmr"
)

type TMPMRHandler struct {
	createUC  *tmpmruc.CreateUseCase
	getUC     *tmpmruc.GetUseCase
	listUC    *tmpmruc.ListUseCase
	updateUC  *tmpmruc.UpdateUseCase
	submitUC  *tmpmruc.SubmitUseCase
	reviewUC  *tmpmruc.ReviewUseCase
	approveUC *tmpmruc.ApproveUseCase
}

func NewTMPMRHandler(
	createUC *tmpmruc.CreateUseCase,
	getUC *tmpmruc.GetUseCase,
	listUC *tmpmruc.ListUseCase,
	updateUC *tmpmruc.UpdateUseCase,
	submitUC *tmpmruc.SubmitUseCase,
	reviewUC *tmpmruc.ReviewUseCase,
	approveUC *tmpmruc.ApproveUseCase,
) *TMPMRHandler {
	return &TMPMRHandler{
		createUC:  createUC,
		getUC:     getUC,
		listUC:    listUC,
		updateUC:  updateUC,
		submitUC:  submitUC,
		reviewUC:  reviewUC,
		approveUC: approveUC,
	}
}

func (h *TMPMRHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	scope := middleware.GetAccessScope(c)
	var organizationID *uuid.UUID
	if raw := c.Query("organization_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(parsed)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			organizationID = &narrowed[0]
		} else {
			organizationID = &parsed
		}
	} else if scope != nil && !scope.IsGlobal && scope.OrganizationID != nil {
		organizationID = scope.OrganizationID
	}

	result, err := h.listUC.Execute(c.Context(), tmpmruc.ListInput{
		OrganizationID: organizationID,
		Period:         c.Query("period"),
		Page:           page,
		Limit:          limit,
		Scope:          scope,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}

func (h *TMPMRHandler) Create(c *fiber.Ctx) error {
	var input tmpmruc.CreateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.Scope = middleware.GetAccessScope(c)

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *TMPMRHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid tmpmr assessment ID")
	}

	result, err := h.getUC.Execute(c.Context(), tmpmruc.GetInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *TMPMRHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid tmpmr assessment ID")
	}

	var input tmpmruc.UpdateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.ID = id
	input.Scope = middleware.GetAccessScope(c)

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *TMPMRHandler) Submit(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid tmpmr assessment ID")
	}

	result, err := h.submitUC.Execute(c.Context(), tmpmruc.SubmitInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *TMPMRHandler) Review(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid tmpmr assessment ID")
	}

	var input struct {
		ReviewerID *uuid.UUID `json:"reviewerId"`
		ReviewNote string     `json:"reviewNote"`
	}
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	result, err := h.reviewUC.Execute(c.Context(), tmpmruc.ReviewInput{
		ID:         id,
		ReviewerID: input.ReviewerID,
		ReviewNote: input.ReviewNote,
		Scope:      middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *TMPMRHandler) Approve(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid tmpmr assessment ID")
	}

	result, err := h.approveUC.Execute(c.Context(), tmpmruc.ApproveInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
