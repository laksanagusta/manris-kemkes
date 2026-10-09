package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	"strconv"
)

func (h *IdentityAuthHandler) ListUsers(c *fiber.Ctx) error {
	i, err := h.requestIdentity(c)
	if err != nil {
		return identityError(c, err)
	}
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		return identityError(c, domainerrors.ErrInvalidInput)
	}
	limit, err := strconv.Atoi(c.Query("limit", "10"))
	if err != nil || limit < 1 {
		return identityError(c, domainerrors.ErrInvalidInput)
	}
	filter := domain.DirectoryFilter{Page: page, Limit: limit, Q: c.Query("q"), Role: c.Query("role"), Status: c.Query("status")}
	if raw := c.Query("organization_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			return identityError(c, domainerrors.ErrInvalidInput)
		}
		filter.OrganizationID = &id
	}
	result, err := h.service.ListUsers(c.Context(), i.ApplicationID, bearerToken(c), filter)
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(result)
}

func (h *IdentityAuthHandler) GetUser(c *fiber.Ctx) error {
	i, err := h.requestIdentity(c)
	if err != nil {
		return identityError(c, err)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return identityError(c, domainerrors.ErrInvalidInput)
	}
	user, err := h.service.GetUser(c.Context(), i.ApplicationID, bearerToken(c), id)
	if err != nil {
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": user})
}
