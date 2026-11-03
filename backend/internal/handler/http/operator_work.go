package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
	workuc "github.com/manris/backend/internal/usecase/operator_work"
	"strconv"
)

type OperatorWorkHandler struct{ service *workuc.Service }

func NewOperatorWorkHandler(service *workuc.Service) *OperatorWorkHandler {
	return &OperatorWorkHandler{service: service}
}
func (h *OperatorWorkHandler) List(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil || scope.UserID == uuid.Nil || scope.OrganizationID == nil || entity.NormalizeRole(scope.Role) != entity.RoleUnit {
		return fiber.ErrForbidden
	}
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 || page > 100000 {
		return fiber.ErrBadRequest
	}
	limit, err := strconv.Atoi(c.Query("limit", "20"))
	if err != nil || limit < 1 || limit > 50 {
		return fiber.ErrBadRequest
	}
	if raw := c.Query("organization_id"); raw != "" && raw != scope.OrganizationID.String() {
		return fiber.ErrForbidden
	}
	view, section := c.Query("view"), c.Query("section")
	if (view != "" && view != "sections") || (section != "" && !workuc.ValidSection(section)) || (view != "" && section != "") {
		return fiber.ErrBadRequest
	}
	if view == "sections" {
		result, err := h.service.Sections(c.Context(), *scope.OrganizationID, scope.UserID)
		if err != nil {
			return handleError(c, err)
		}
		return c.JSON(fiber.Map{"data": result})
	}
	if section != "" {
		result, err := h.service.ListSection(c.Context(), *scope.OrganizationID, scope.UserID, section, page, limit)
		if err != nil {
			return handleError(c, err)
		}
		return c.JSON(fiber.Map{"data": result})
	}
	result, err := h.service.List(c.Context(), *scope.OrganizationID, scope.UserID, page, limit)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}
