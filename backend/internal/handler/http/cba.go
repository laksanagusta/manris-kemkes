package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/entity"
	cbauc "github.com/manris/backend/internal/usecase/cba"
)

// CBAHandler handles CBA-related HTTP requests
type CBAHandler struct {
	recommendUC *cbauc.RecommendVariablesUseCase
	calculateUC *cbauc.CalculateUseCase
}

// NewCBAHandler creates a new CBA handler
func NewCBAHandler(
	recommendUC *cbauc.RecommendVariablesUseCase,
	calculateUC *cbauc.CalculateUseCase,
) *CBAHandler {
	return &CBAHandler{
		recommendUC: recommendUC,
		calculateUC: calculateUC,
	}
}

// RecommendVariablesRequest represents request for CBA variable recommendation
type RecommendVariablesRequest struct {
	RiskDescription string `json:"riskDescription"`
}

// RecommendVariables handles POST /api/v1/cba/recommend
func (h *CBAHandler) RecommendVariables(c *fiber.Ctx) error {
	var req RecommendVariablesRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	if req.RiskDescription == "" {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Risk description is required")
	}

	result, err := h.recommendUC.Execute(c.Context(), cbauc.RecommendVariablesInput{
		RiskDescription: req.RiskDescription,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// CalculateRequest represents request for CBA calculation
type CalculateRequest struct {
	RiskDescription    string                `json:"riskDescription"`
	Population         float64               `json:"population"`
	CaseCount          float64               `json:"caseCount"`
	ProgramEffectivity float64               `json:"programEffectivity"`
	PopulationCoverage float64               `json:"populationCoverage"`
	CostOfInactionVars []CBAVariableInputDTO `json:"costOfInactionVars"`
	CostOfActionVars   []CBAVariableInputDTO `json:"costOfActionVars"`
}

// CBAVariableInputDTO represents a variable input from the client
type CBAVariableInputDTO struct {
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Value    float64 `json:"value"`
	Unit     string  `json:"unit"`
}

// Calculate handles POST /api/v1/cba/calculate
func (h *CBAHandler) Calculate(c *fiber.Ctx) error {
	var req CalculateRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// Convert DTOs to domain entities
	input := cbauc.CalculateInput{
		RiskDescription:    req.RiskDescription,
		Population:         req.Population,
		CaseCount:          req.CaseCount,
		ProgramEffectivity: req.ProgramEffectivity,
		PopulationCoverage: req.PopulationCoverage,
	}

	for _, v := range req.CostOfInactionVars {
		input.CostOfInactionVars = append(input.CostOfInactionVars, entity.CBAVariableInput{
			Name:     v.Name,
			Category: entity.CBAVariableCategory(v.Category),
			Value:    v.Value,
			Unit:     v.Unit,
		})
	}
	for _, v := range req.CostOfActionVars {
		input.CostOfActionVars = append(input.CostOfActionVars, entity.CBAVariableInput{
			Name:     v.Name,
			Category: entity.CBAVariableCategory(v.Category),
			Value:    v.Value,
			Unit:     v.Unit,
		})
	}

	result, err := h.calculateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
