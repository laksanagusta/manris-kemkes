package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/errors"
	systemuc "github.com/manris/backend/internal/usecase/system"
)

// SystemHandler handles system HTTP requests using clean architecture
type SystemHandler struct {
	slowQueriesUC *systemuc.GetSlowQueriesUseCase
}

// NewSystemHandler creates a new system handler
func NewSystemHandler(slowQueriesUC *systemuc.GetSlowQueriesUseCase) *SystemHandler {
	return &SystemHandler{
		slowQueriesUC: slowQueriesUC,
	}
}

// GetSlowQueries handles GET /api/v1/system/slow-queries
func (h *SystemHandler) GetSlowQueries(c *fiber.Ctx) error {
	// 1. Get role from context (set by auth middleware)
	role, ok := c.Locals("role").(string)
	if !ok {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "tidak sah")
	}

	// 2. Get limit from query
	limit := c.QueryInt("limit", 10)

	// 3. Execute use case
	queries, err := h.slowQueriesUC.Execute(c.Context(), systemuc.GetSlowQueriesInput{
		Limit: limit,
		Role:  role,
	})
	if err != nil {
		return handleSystemError(c, err)
	}

	// 4. Return response
	return c.JSON(fiber.Map{
		"correlationId": c.Locals("correlationId"),
		"slowQueries":   queries,
	})
}

// handleSystemError converts domain errors to HTTP responses
func handleSystemError(c *fiber.Ctx, err error) error {
	if errors.IsForbidden(err) {
		return sendProblemDetails(c, fiber.StatusForbidden, "Terlarang", "https://api.manris.com/errors/forbidden", err.Error())
	}

	// Default to 500 for other errors
	return sendProblemDetails(c, fiber.StatusInternalServerError, "Kesalahan Server", "https://api.manris.com/errors/server-error", err.Error())
}
