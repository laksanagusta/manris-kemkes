package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	organizationuc "github.com/manris/backend/internal/usecase/organization"
)

type OrganizationHandler struct {
	createUC     *organizationuc.CreateOrganizationUseCase
	getUC        *organizationuc.GetOrganizationUseCase
	updateUC     *organizationuc.UpdateOrganizationUseCase
	deleteUC     *organizationuc.DeleteOrganizationUseCase
	listUC       *organizationuc.ListOrganizationsUseCase
	listFilterUC *organizationuc.ListOrganizationsWithFilterUseCase
}

func NewOrganizationHandler(
	createUC *organizationuc.CreateOrganizationUseCase,
	getUC *organizationuc.GetOrganizationUseCase,
	updateUC *organizationuc.UpdateOrganizationUseCase,
	deleteUC *organizationuc.DeleteOrganizationUseCase,
	listUC *organizationuc.ListOrganizationsUseCase,
	listFilterUC *organizationuc.ListOrganizationsWithFilterUseCase,
) *OrganizationHandler {
	return &OrganizationHandler{
		createUC:     createUC,
		getUC:        getUC,
		updateUC:     updateUC,
		deleteUC:     deleteUC,
		listUC:       listUC,
		listFilterUC: listFilterUC,
	}
}

func (h *OrganizationHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	q := c.Query("q")

	result, err := h.listFilterUC.Execute(c.Context(), organizationuc.ListOrganizationsWithFilterInput{
		Page:  page,
		Limit: limit,
		Q:     q,
	})
	if err != nil {
		return handleOrganizationError(c, err)
	}

	return c.JSON(result)
}

func (h *OrganizationHandler) Create(c *fiber.Ctx) error {
	var input organizationuc.CreateOrganizationInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleOrganizationError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

func (h *OrganizationHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	org, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleOrganizationError(c, err)
	}

	return c.JSON(fiber.Map{"data": org})
}

func (h *OrganizationHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	var input organizationuc.UpdateOrganizationInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ID = id

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleOrganizationError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *OrganizationHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleOrganizationError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func handleOrganizationError(c *fiber.Ctx, err error) error {
	switch {
	case errors.IsNotFound(err):
		return sendProblemDetails(c, fiber.StatusNotFound, "Not Found", "https://api.manris.com/errors/not-found", err.Error())
	case errors.IsValidation(err):
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/validation", err.Error())
	case errors.IsForbidden(err):
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", err.Error())
	case errors.IsUnauthorized(err):
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", err.Error())
	default:
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Server Error", "https://api.manris.com/errors/server-error", err.Error())
	}
}
