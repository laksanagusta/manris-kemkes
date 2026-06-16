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
	summaryUC     *performanceriskuc.SummaryUseCase
	nodesUC       *performanceriskuc.PlanningMapUseCase
	detailUC      *performanceriskuc.DetailUseCase
	unlinkedUC    *performanceriskuc.UnlinkedUseCase
	groupResolver organizationGroupReportResolver
}

func NewPerformanceRiskHandler(
	summaryUC *performanceriskuc.SummaryUseCase,
	nodesUC *performanceriskuc.PlanningMapUseCase,
	detailUC *performanceriskuc.DetailUseCase,
	unlinkedUC *performanceriskuc.UnlinkedUseCase,
	groupResolver organizationGroupReportResolver,
) *PerformanceRiskHandler {
	return &PerformanceRiskHandler{
		summaryUC:     summaryUC,
		nodesUC:       nodesUC,
		detailUC:      detailUC,
		unlinkedUC:    unlinkedUC,
		groupResolver: groupResolver,
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID RO tidak valid")
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
			_ = sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID perencanaan tidak valid")
			return performanceriskuc.Input{}, false
		}
		planningID = &parsed
	}
	if period == "" && planningID == nil {
		_ = sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "parameter kueri period wajib diisi")
		return performanceriskuc.Input{}, false
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReportOrgIDsFromQuery(c.Context(), scope, c.Query("org_id"), c.Query("organization_group_id"), h.groupResolver)
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			_ = sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
			return performanceriskuc.Input{}, false
		}
		if errors.Is(err, domainerrors.ErrInvalidInput) {
			_ = sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id dan organization_group_id tidak dapat digunakan bersamaan")
			return performanceriskuc.Input{}, false
		}
		_ = sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
