package http

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	planninguc "github.com/manris/backend/internal/usecase/planning"
)

type PlanningHierarchyHandler struct {
	listROOptionsUC     *planninguc.ListROOptionsUseCase
	listCompatibilityUC *planninguc.ListObjectiveCompatibilityUseCase
}

func NewPlanningHierarchyHandler(
	listROOptionsUC *planninguc.ListROOptionsUseCase,
	listCompatibilityUC *planninguc.ListObjectiveCompatibilityUseCase,
) *PlanningHierarchyHandler {
	return &PlanningHierarchyHandler{
		listROOptionsUC:     listROOptionsUC,
		listCompatibilityUC: listCompatibilityUC,
	}
}

func (h *PlanningHierarchyHandler) ListROOptions(c *fiber.Ctx) error {
	orgID, err := uuid.Parse(c.Query("organization_id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}
	var planningID *uuid.UUID
	if raw := c.Query("planning_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID perencanaan tidak valid")
		}
		planningID = &parsed
	}

	result, err := h.listROOptionsUC.Execute(c.Context(), planninguc.ListROOptionsInput{
		OrganizationID: orgID,
		PlanningID:     planningID,
		Period:         strings.TrimSpace(c.Query("period")),
		Query:          strings.TrimSpace(c.Query("q")),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}

func (h *PlanningHierarchyHandler) ListObjectiveCompatibility(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	var organizationID *uuid.UUID
	if raw := c.Query("organization_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
		}
		organizationID = &parsed
	}

	result, err := h.listCompatibilityUC.Execute(c.Context(), planninguc.ListObjectiveCompatibilityInput{
		OrganizationID: organizationID,
		Period:         strings.TrimSpace(c.Query("period")),
		Query:          strings.TrimSpace(c.Query("q")),
		Page:           page,
		Limit:          limit,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}
