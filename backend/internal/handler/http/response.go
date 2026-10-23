package http

import (
	"log/slog"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/pkg/requestmeta"
)

// sendProblemDetails formats error responses according to RFC 7807 Problem Details
func sendProblemDetails(c *fiber.Ctx, status int, title, errorType, detail string) error {
	logHTTPProblem(c, status)
	c.Set(fiber.HeaderContentType, "application/problem+json")
	return c.Status(status).JSON(fiber.Map{
		"type":     errorType,
		"title":    title,
		"status":   status,
		"detail":   detail,
		"instance": c.Path(),
	})
}

func sendProblemDetailsWithDetails(c *fiber.Ctx, status int, title, errorType, detail string, details any) error {
	logHTTPProblem(c, status)
	c.Set(fiber.HeaderContentType, "application/problem+json")
	return c.Status(status).JSON(fiber.Map{
		"type":     errorType,
		"title":    title,
		"status":   status,
		"detail":   detail,
		"details":  details,
		"instance": c.Path(),
	})
}

// handleError is a unified error handler that converts domain errors to HTTP RFC 7807 Problem Details
func handleError(c *fiber.Ctx, err error) error {
	if errors.IsNotFound(err) {
		return sendProblemDetails(c, fiber.StatusNotFound, "Sumber Daya Tidak Ditemukan", "https://api.manris.com/errors/not-found", err.Error())
	}
	if errors.IsUnauthorized(err) || errors.IsInvalidCredentials(err) {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Tidak Sah", "https://api.manris.com/errors/unauthorized", err.Error())
	}
	if errors.IsForbidden(err) || errors.IsAccountInactive(err) || errors.IsAccountPendingApproval(err) {
		return sendProblemDetails(c, fiber.StatusForbidden, "Terlarang", "https://api.manris.com/errors/forbidden", err.Error())
	}

	// Validation Errors
	if errors.IsValidation(err) {
		return sendProblemDetails(c, fiber.StatusUnprocessableEntity, "Kesalahan Validasi", "https://api.manris.com/errors/validation-error", err.Error())
	}

	// Default 500
	return sendProblemDetails(c, fiber.StatusInternalServerError, "Kesalahan Server Internal", "https://api.manris.com/errors/internal-server-error", err.Error())
}

// Problem titles, details, raw errors, URLs and headers can contain customer data.
// The registered route template is safe to log; the actual request path is not.
func logHTTPProblem(c *fiber.Ctx, status int) {
	slog.WarnContext(c.Context(), "http_problem",
		"status", status,
		"error_code", "http_"+strconv.Itoa(status),
		"method", c.Method(),
		"route", c.Route().Path,
		"correlation_id", requestmeta.CorrelationID(c.Context()),
	)
}
