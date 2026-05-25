package http

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	performanceriskuc "github.com/manris/backend/internal/usecase/performancerisk"
)

type PerformanceRiskHandler struct {
	summaryUC  *performanceriskuc.SummaryUseCase
	nodesUC    *performanceriskuc.PlanningMapUseCase
	detailUC   *performanceriskuc.DetailUseCase
	unlinkedUC *performanceriskuc.UnlinkedUseCase
}

func NewPerformanceRiskHandler(
	summaryUC *performanceriskuc.SummaryUseCase,
	nodesUC *performanceriskuc.PlanningMapUseCase,
	detailUC *performanceriskuc.DetailUseCase,
	unlinkedUC *performanceriskuc.UnlinkedUseCase,
) *PerformanceRiskHandler {
	return &PerformanceRiskHandler{
		summaryUC:  summaryUC,
		nodesUC:    nodesUC,
		detailUC:   detailUC,
		unlinkedUC: unlinkedUC,
	}
}

func (h *PerformanceRiskHandler) Summary(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}

	result, err := h.summaryUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) Nodes(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}

	result, err := h.nodesUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) Detail(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}

	roID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid RO ID")
	}

	result, err := h.detailUC.Execute(c.Context(), performanceriskuc.DetailInput{Input: input, ROID: roID})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) UnlinkedRisks(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}

	result, err := h.unlinkedUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) parseInput(c *fiber.Ctx) (performanceriskuc.Input, bool) {
	period := c.Query("period")
	var planningID *uuid.UUID
	if raw := c.Query("planning_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			_ = sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid planning ID")
			return performanceriskuc.Input{}, false
		}
		planningID = &parsed
	}
	if period == "" && planningID == nil {
		_ = sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "period query parameter is required")
		return performanceriskuc.Input{}, false
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			_ = sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			return performanceriskuc.Input{}, false
		}
		_ = sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		return performanceriskuc.Input{}, false
	}

	return performanceriskuc.Input{
		Period:     period,
		PlanningID: planningID,
		OrgIDs:     orgIDs,
	}, true
}

var _ interface {
	Summary(c *fiber.Ctx) error
	Nodes(c *fiber.Ctx) error
	Detail(c *fiber.Ctx) error
	UnlinkedRisks(c *fiber.Ctx) error
} = &PerformanceRiskHandler{}
