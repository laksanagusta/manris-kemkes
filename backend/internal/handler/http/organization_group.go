package http

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	organizationgroupuc "github.com/manris/backend/internal/usecase/organizationgroup"
)

type OrganizationGroupHandler struct {
	createUC  *organizationgroupuc.CreateUseCase
	updateUC  *organizationgroupuc.UpdateUseCase
	listUC    *organizationgroupuc.ListUseCase
	getUC     *organizationgroupuc.GetUseCase
	deleteUC  *organizationgroupuc.DeleteUseCase
	resolveUC *organizationgroupuc.ResolveUseCase
}

func NewOrganizationGroupHandler(
	createUC *organizationgroupuc.CreateUseCase,
	updateUC *organizationgroupuc.UpdateUseCase,
	listUC *organizationgroupuc.ListUseCase,
	getUC *organizationgroupuc.GetUseCase,
	deleteUC *organizationgroupuc.DeleteUseCase,
	resolveUC *organizationgroupuc.ResolveUseCase,
) *OrganizationGroupHandler {
	return &OrganizationGroupHandler{
		createUC:  createUC,
		updateUC:  updateUC,
		listUC:    listUC,
		getUC:     getUC,
		deleteUC:  deleteUC,
		resolveUC: resolveUC,
	}
}

func (h *OrganizationGroupHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	var ownerOrganizationID *uuid.UUID
	if raw := c.Query("owner_organization_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid owner organization ID")
		}
		ownerOrganizationID = &parsed
	}

	includeMembers, err := strconv.ParseBool(c.Query("include_members", "false"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid include_members value")
	}

	result, err := h.listUC.Execute(c.Context(), organizationgroupuc.ListInput{
		OwnerOrganizationID: ownerOrganizationID,
		Q:                   c.Query("q"),
		Page:                page,
		Limit:               limit,
		IncludeMembers:      includeMembers,
		Scope:               middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}

	return c.JSON(result)
}

func (h *OrganizationGroupHandler) Create(c *fiber.Ctx) error {
	var input organizationgroupuc.CreateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.Scope = middleware.GetAccessScope(c)

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *OrganizationGroupHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization group ID")
	}

	result, err := h.getUC.Execute(c.Context(), organizationgroupuc.GetInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *OrganizationGroupHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization group ID")
	}

	var input organizationgroupuc.UpdateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.ID = id
	input.Scope = middleware.GetAccessScope(c)

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *OrganizationGroupHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization group ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), organizationgroupuc.DeleteInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func handleOrganizationGroupError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domainerrors.ErrNotFound):
		return sendProblemDetails(c, fiber.StatusNotFound, "Not Found", "https://api.manris.com/errors/not-found", err.Error())
	case errors.Is(err, domainerrors.ErrConflict):
		return sendProblemDetails(c, fiber.StatusConflict, "Conflict", "https://api.manris.com/errors/conflict", err.Error())
	case domainerrors.IsValidation(err):
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", err.Error())
	case errors.Is(err, domainerrors.ErrForbidden):
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", err.Error())
	case errors.Is(err, domainerrors.ErrUnauthorized):
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", err.Error())
	default:
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Server Error", "https://api.manris.com/errors/server-error", err.Error())
	}
}
