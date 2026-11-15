package http

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
)

func ListInbox(repo repository.InboxRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userId").(uuid.UUID)
		if !ok {
			return sendProblemDetails(c, 401, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "sesi tidak tersedia")
		}
		scope := middleware.GetAccessScope(c)
		if scope == nil {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "cakupan akses tidak tersedia")
		}
		role, _ := c.Locals("role").(string)

		var orgID *uuid.UUID
		if raw := c.Query("organization_id"); raw != "" {
			parsed, err := uuid.Parse(raw)
			if err != nil {
				return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
			}
			orgID = &parsed
		}

		filter := repository.InboxFilter{
			UserID:         userID,
			AssignedOnly:   role != "superadmin",
			Global:         scope.IsGlobal,
			ReadableOrgIDs: scope.AccessibleOrgIDs,
			OrganizationID: orgID,
			Status:         c.Query("status"),
			RequestType:    c.Query("type"),
			Query:          strings.TrimSpace(c.Query("q")),
			SortBy:         c.Query("sort_by"),
			SortOrder:      c.Query("sort_order"),
			Page:           max(1, min(c.QueryInt("page", 1), 1_000_000_000)),
			Limit:          max(1, min(c.QueryInt("limit", 10), 100)),
		}
		result, err := repo.List(c.Context(), filter)
		if err != nil {
			return handleError(c, err)
		}
		return c.JSON(result)
	}
}
