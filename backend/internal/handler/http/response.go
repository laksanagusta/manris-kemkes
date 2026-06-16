package http

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/errors"
)

// sendProblemDetails formats error responses according to RFC 7807 Problem Details
func sendProblemDetails(c *fiber.Ctx, status int, title, errorType, detail string) error {
	log.Printf("http problem details status=%d title=%q path=%q detail=%q", status, title, c.Path(), detail)
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
	log.Printf("http problem details status=%d title=%q path=%q detail=%q", status, title, c.Path(), detail)
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
	log.Printf("http handler error path=%q err=%v", c.Path(), err)
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
