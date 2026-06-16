package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	authuc "github.com/manris/backend/internal/usecase/auth"
)

// AuthHandler handles authentication HTTP requests using clean architecture
type AuthHandler struct {
	loginUC          *authuc.LoginUseCase
	registerUC       *authuc.RegisterUseCase
	meUC             *authuc.GetCurrentUserUseCase
	updateProfileUC  *authuc.UpdateProfileUseCase
	changePasswordUC *authuc.ChangePasswordUseCase
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(
	loginUC *authuc.LoginUseCase,
	registerUC *authuc.RegisterUseCase,
	meUC *authuc.GetCurrentUserUseCase,
	updateProfileUC *authuc.UpdateProfileUseCase,
	changePasswordUC *authuc.ChangePasswordUseCase,
) *AuthHandler {
	return &AuthHandler{
		loginUC:          loginUC,
		registerUC:       registerUC,
		meUC:             meUC,
		updateProfileUC:  updateProfileUC,
		changePasswordUC: changePasswordUC,
	}
}

// LoginRequest represents the login request body
type LoginRequest struct {
	NIP      string `json:"nip"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

type UpdateProfileRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	NIP     string `json:"nip"`
	Jabatan string `json:"jabatan"`
	Pangkat string `json:"pangkat"`
}

type RegisterRequest struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
	OrganizationID  string `json:"organizationId"`
	NIP             string `json:"nip"`
	Jabatan         string `json:"jabatan"`
	Pangkat         string `json:"pangkat"`
	PhoneNumber     string `json:"phoneNumber"`
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	// 1. Parse request
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	// 2. Execute use case
	result, err := h.loginUC.Execute(c.Context(), authuc.LoginInput{
		NIP:      req.NIP,
		Password: req.Password,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}

// Register handles POST /api/v1/auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	orgID, err := uuid.Parse(req.OrganizationID)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}

	result, err := h.registerUC.Execute(c.Context(), authuc.RegisterInput{
		Name:            req.Name,
		Email:           req.Email,
		Password:        req.Password,
		ConfirmPassword: req.ConfirmPassword,
		OrganizationID:  &orgID,
		NIP:             req.NIP,
		Jabatan:         req.Jabatan,
		Pangkat:         req.Pangkat,
		PhoneNumber:     req.PhoneNumber,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

// Me handles GET /api/v1/auth/me
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}

	// 3. Execute use case
	user, err := h.meUC.Execute(c.Context(), authuc.GetCurrentUserInput{
		UserID: userID,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 4. Return response
	return c.JSON(fiber.Map{"data": user})
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}

	result, err := h.changePasswordUC.Execute(c.Context(), authuc.ChangePasswordInput{
		UserID:          userID,
		CurrentPassword: req.CurrentPassword,
		NewPassword:     req.NewPassword,
		ConfirmPassword: req.ConfirmPassword,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}

	result, err := h.updateProfileUC.Execute(c.Context(), authuc.UpdateProfileInput{
		UserID:   userID,
		Name:     req.Name,
		Email:    req.Email,
		NIP:      req.NIP,
		Jabatan:  req.Jabatan,
		Pangkat:  req.Pangkat,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func userIDFromContext(c *fiber.Ctx) (uuid.UUID, error) {
	switch v := c.Locals("userId").(type) {
	case uuid.UUID:
		return v, nil
	case string:
		parsed, err := uuid.Parse(v)
		if err != nil {
			return uuid.Nil, sendProblemDetails(c, fiber.StatusUnauthorized, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "ID pengguna tidak valid")
		}
		return parsed, nil
	default:
		return uuid.Nil, sendProblemDetails(c, fiber.StatusUnauthorized, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "tidak sah")
	}
}
