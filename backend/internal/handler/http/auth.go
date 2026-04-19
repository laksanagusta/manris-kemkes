package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	authuc "github.com/manris/backend/internal/usecase/auth"
)

// AuthHandler handles authentication HTTP requests using clean architecture
type AuthHandler struct {
	loginUC          *authuc.LoginUseCase
	meUC             *authuc.GetCurrentUserUseCase
	changePasswordUC *authuc.ChangePasswordUseCase
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(
	loginUC *authuc.LoginUseCase,
	meUC *authuc.GetCurrentUserUseCase,
	changePasswordUC *authuc.ChangePasswordUseCase,
) *AuthHandler {
	return &AuthHandler{
		loginUC:          loginUC,
		meUC:             meUC,
		changePasswordUC: changePasswordUC,
	}
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	// 1. Parse request
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	// 2. Execute use case
	result, err := h.loginUC.Execute(c.Context(), authuc.LoginInput{
		Username: req.Username,
		Password: req.Password,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
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
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}

	result, err := h.changePasswordUC.Execute(c.Context(), authuc.ChangePasswordInput{
		UserID:          userID,
		NewPassword:     req.NewPassword,
		ConfirmPassword: req.ConfirmPassword,
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
			return uuid.Nil, sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "invalid user ID")
		}
		return parsed, nil
	default:
		return uuid.Nil, sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}
}
