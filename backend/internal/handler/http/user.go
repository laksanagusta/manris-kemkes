package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	useruc "github.com/manris/backend/internal/usecase/user"
)

// UserHandler handles HTTP requests for User operations using clean architecture
type UserHandler struct {
	createUC *useruc.CreateUserUseCase
	getUC    *useruc.GetUserUseCase
	updateUC *useruc.UpdateUserUseCase
	deleteUC *useruc.DeleteUserUseCase
	listUC   *useruc.ListUsersUseCase
}

func NewUserHandler(
	createUC *useruc.CreateUserUseCase,
	getUC *useruc.GetUserUseCase,
	updateUC *useruc.UpdateUserUseCase,
	deleteUC *useruc.DeleteUserUseCase,
	listUC *useruc.ListUsersUseCase,
) *UserHandler {
	return &UserHandler{
		createUC: createUC,
		getUC:    getUC,
		updateUC: updateUC,
		deleteUC: deleteUC,
		listUC:   listUC,
	}
}

// CreateUser handles POST /api/users
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var input useruc.CreateUserInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetUser handles GET /api/users/:id
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid user ID")
	}

	user, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": user})
}

// UpdateUser handles PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid user ID")
	}

	var input useruc.UpdateUserInput
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

// DeleteUser handles DELETE /api/users/:id
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid user ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListUsers handles GET /api/users
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	users, err := h.listUC.Execute(c.Context())
	if err != nil {
		return handleError(c, err)
	}

	if users == nil {
		users = []*entity.User{}
	}
	return c.JSON(fiber.Map{"data": users})
}
