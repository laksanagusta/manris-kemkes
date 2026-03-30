package http

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// RiskHandler handles HTTP requests for Risk operations using clean architecture
type RiskHandler struct {
	createUC           *riskuc.CreateRiskUseCase
	getUC              *riskuc.GetRiskUseCase
	updateUC           *riskuc.UpdateRiskUseCase
	deleteUC           *riskuc.DeleteRiskUseCase
	listUC             *riskuc.ListRisksUseCase
	dashboardSummaryUC *riskuc.DashboardSummaryUseCase
	heatmapDataUC      *riskuc.HeatmapDataUseCase
	topRisksUC         *riskuc.TopRisksUseCase
}

func NewRiskHandler(
	createUC *riskuc.CreateRiskUseCase,
	getUC *riskuc.GetRiskUseCase,
	updateUC *riskuc.UpdateRiskUseCase,
	deleteUC *riskuc.DeleteRiskUseCase,
	listUC *riskuc.ListRisksUseCase,
	dashboardSummaryUC *riskuc.DashboardSummaryUseCase,
	heatmapDataUC *riskuc.HeatmapDataUseCase,
	topRisksUC *riskuc.TopRisksUseCase,
) *RiskHandler {
	return &RiskHandler{
		createUC:           createUC,
		getUC:              getUC,
		updateUC:           updateUC,
		deleteUC:           deleteUC,
		listUC:             listUC,
		dashboardSummaryUC: dashboardSummaryUC,
		heatmapDataUC:      heatmapDataUC,
		topRisksUC:         topRisksUC,
	}
}

// CreateRisk handles POST /api/risks
func (h *RiskHandler) CreateRisk(c *fiber.Ctx) error {
	var input riskuc.CreateRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", fmt.Sprintf("invalid request body: %v", err))
	}

	// Get user ID from context (set by auth middleware)
	// Note: middleware sets "userId" (camelCase), not "userID"
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}
	input.CreatedBy = &userID

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetRisk handles GET /api/risks/:id
func (h *RiskHandler) GetRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	risk, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": risk})
}

// UpdateRisk handles PUT /api/risks/:id
func (h *RiskHandler) UpdateRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	var input riskuc.UpdateRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ID = id

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// DeleteRisk handles DELETE /api/risks/:id
func (h *RiskHandler) DeleteRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListRisks handles GET /api/risks
func (h *RiskHandler) ListRisks(c *fiber.Ctx) error {
	var input riskuc.ListRisksInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

	input.Status = c.Query("status", "all")

	risks, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if risks == nil {
		risks = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": risks})
}

// DashboardSummary handles GET /api/risks/dashboard/summary
func (h *RiskHandler) DashboardSummary(c *fiber.Ctx) error {
	summary, err := h.dashboardSummaryUC.Execute(c.Context())
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": summary})
}

// HeatmapData handles GET /api/risks/dashboard/heatmap
func (h *RiskHandler) HeatmapData(c *fiber.Ctx) error {
	data, err := h.heatmapDataUC.Execute(c.Context())
	if err != nil {
		return handleError(c, err)
	}

	// Initialize 5x5 matrix
	matrix := [5][5]int{}
	for _, cell := range data {
		// probability and impact are 1-5, matrix is 0-4
		pIdx := cell.Probability - 1
		iIdx := cell.Impact - 1
		if pIdx >= 0 && pIdx < 5 && iIdx >= 0 && iIdx < 5 {
			matrix[pIdx][iIdx] = cell.Count
		}
	}

	return c.JSON(fiber.Map{"data": matrix})
}

// TopRisks handles GET /api/risks/dashboard/top
func (h *RiskHandler) TopRisks(c *fiber.Ctx) error {
	limit := 10
	if l := c.QueryInt("limit"); l > 0 {
		limit = l
	}

	input := riskuc.TopRisksInput{Limit: limit}

	risks, err := h.topRisksUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if risks == nil {
		risks = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": risks})
}
