package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/usecase/impactcriteria"
)

// impactCriteriaHandler handles HTTP requests for impact criteria.
type impactCriteriaHandler struct {
	listUC impactcriteria.ListUseCase
}

// NewImpactCriteriaHandler creates a new impact criteria handler.
func NewImpactCriteriaHandler(listUC impactcriteria.ListUseCase) *impactCriteriaHandler {
	return &impactCriteriaHandler{listUC: listUC}
}

// List handles GET /impact-criteria
func (h *impactCriteriaHandler) List(c *fiber.Ctx) error {
	category := c.Query("category")
	uprLevel := c.Query("uprLevel")
	impactLevelStr := c.Query("impactLevel")

	var impactLevel *int
	if impactLevelStr != "" {
		if lvl, err := strconv.Atoi(impactLevelStr); err == nil {
			impactLevel = &lvl
		}
	}

	var cat *string
	if category != "" {
		cat = &category
	}
	var upr *string
	if uprLevel != "" {
		upr = &uprLevel
	}

	input := impactcriteria.ListInput{
		Category:    cat,
		UPRLevel:    upr,
		ImpactLevel: impactLevel,
	}

	result, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return c.JSON(fiber.Map{
		"data":  result.Criteria,
		"total": result.Total,
	})
}