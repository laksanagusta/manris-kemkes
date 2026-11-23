package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	identitydomain "github.com/manris/backend/internal/identity/domain"
	"github.com/manris/backend/internal/middleware"
	useruc "github.com/manris/backend/internal/usecase/user"
)

type createUserRequest struct {
	Name           string `json:"name"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	Role           string `json:"role"`
	OrganizationID string `json:"organizationId"`
	NIP            string `json:"nip"`
	Jabatan        string `json:"jabatan"`
	Pangkat        string `json:"pangkat"`
}

type UserHandler struct {
	createUC     *useruc.CreateUserUseCase
	getUC        *useruc.GetUserUseCase
	updateUC     *useruc.UpdateUserUseCase
	deleteUC     *useruc.DeleteUserUseCase
	listUC       *useruc.ListUsersUseCase
	listFilterUC *useruc.ListUsersWithFilterUseCase
	approveUC    *useruc.ApproveRegistrationUseCase
	rejectUC     *useruc.RejectRegistrationUseCase
}

func NewUserHandler(
	createUC *useruc.CreateUserUseCase,
	getUC *useruc.GetUserUseCase,
	updateUC *useruc.UpdateUserUseCase,
	deleteUC *useruc.DeleteUserUseCase,
	listUC *useruc.ListUsersUseCase,
	listFilterUC *useruc.ListUsersWithFilterUseCase,
	approveUC *useruc.ApproveRegistrationUseCase,
	rejectUC *useruc.RejectRegistrationUseCase,
) *UserHandler {
	return &UserHandler{
		createUC:     createUC,
		getUC:        getUC,
		updateUC:     updateUC,
		deleteUC:     deleteUC,
		listUC:       listUC,
		listFilterUC: listFilterUC,
		approveUC:    approveUC,
		rejectUC:     rejectUC,
	}
}

// CreateUser handles POST /api/users
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req createUserRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	var organizationID *uuid.UUID
	if req.OrganizationID != "" {
		parsedID, err := uuid.Parse(req.OrganizationID)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
		}
		organizationID = &parsedID
	}

	input := useruc.CreateUserInput{
		Name:           req.Name,
		Email:          req.Email,
		Password:       req.Password,
		Role:           req.Role,
		OrganizationID: organizationID,
		NIP:            req.NIP,
		Jabatan:        req.Jabatan,
		Pangkat:        req.Pangkat,
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetUser handles GET /api/users/:id
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return handleError(c, domainerrors.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pengguna tidak valid")
	}

	user, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}
	if user == nil || (!scope.IsGlobal && (user.OrganizationID == nil || !scope.CanRead(*user.OrganizationID))) {
		return handleError(c, domainerrors.ErrNotFound)
	}
	if !scope.IsGlobal {
		return c.JSON(fiber.Map{"data": pickerDirectoryUser(user)})
	}

	return c.JSON(fiber.Map{"data": user})
}

// UpdateUser handles PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pengguna tidak valid")
	}

	var input useruc.UpdateUserInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pengguna tidak valid")
	}

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ApproveRegistration handles POST /api/users/:id/approve-registration
func (h *UserHandler) ApproveRegistration(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pengguna tidak valid")
	}

	result, err := h.approveUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// RejectRegistration handles DELETE /api/users/:id/reject-registration
func (h *UserHandler) RejectRegistration(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pengguna tidak valid")
	}

	result, err := h.rejectUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListUsers handles GET /api/users
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return handleError(c, domainerrors.ErrUnauthorized)
	}
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	q := c.Query("q")
	status := c.Query("status")
	role := c.Query("role")
	organizationId := c.Query("organizationId")

	var allowedOrgIDs []uuid.UUID
	if !scope.IsGlobal {
		allowedOrgIDs = append([]uuid.UUID{}, scope.AccessibleOrgIDs...)
	}
	if organizationId != "" {
		organizationID, err := uuid.Parse(organizationId)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "format ID organisasi tidak valid")
		}
		if !scope.CanRead(organizationID) {
			return handleError(c, domainerrors.ErrForbidden)
		}
	}

	result, err := h.listFilterUC.Execute(c.Context(), useruc.ListUsersWithFilterInput{
		SortBy: c.Query("sort_by"), SortOrder: c.Query("sort_order"),
		Page:           page,
		Limit:          limit,
		Q:              q,
		Status:         status,
		Role:           role,
		OrganizationID: organizationId,
		AllowedOrgIDs:  allowedOrgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}

	if scope.IsGlobal {
		return c.JSON(result)
	}
	users := make([]*identitydomain.DirectoryUser, 0, len(result.Data))
	for _, user := range result.Data {
		users = append(users, pickerDirectoryUser(user))
	}
	return c.JSON(&identitydomain.DirectoryPage{
		Data: users, Total: result.Total, Page: result.Page, Limit: result.Limit,
	})
}

func pickerDirectoryUser(user *entity.User) *identitydomain.DirectoryUser {
	result := identitydomain.DirectoryUserFrom(user)
	result.PhoneNumber = ""
	return result
}
