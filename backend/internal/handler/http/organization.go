package http

import (
	"github.com/gofiber/fiber/v2"
	organizationuc "github.com/manris/backend/internal/usecase/organization"
)

// OrganizationHandler handles organization HTTP requests using clean architecture
type OrganizationHandler struct {
	listUC *organizationuc.ListOrganizationsUseCase
}

// NewOrganizationHandler creates a new organization handler
func NewOrganizationHandler(listUC *organizationuc.ListOrganizationsUseCase) *OrganizationHandler {
	return &OrganizationHandler{
		listUC: listUC,
	}
}

// List handles GET /api/v1/organizations
func (h *OrganizationHandler) List(c *fiber.Ctx) error {
	// Execute use case
	orgs, err := h.listUC.Execute(c.Context())
	if err != nil {
		return handleOrganizationError(c, err)
	}

	// Return response
	return c.JSON(fiber.Map{"data": orgs})
}

// handleOrganizationError converts domain errors to HTTP responses
func handleOrganizationError(c *fiber.Ctx, err error) error {
	// Default to 500 for errors
	return sendProblemDetails(c, fiber.StatusInternalServerError, "Server Error", "https://api.manris.com/errors/server-error", err.Error())
}
