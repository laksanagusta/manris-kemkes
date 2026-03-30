package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/entity"
	aiuc "github.com/manris/backend/internal/usecase/ai"
)

// AIHandler handles AI-related HTTP requests using clean architecture
type AIHandler struct {
	fishboneUC       *aiuc.GenerateFishboneUseCase
	impactUC         *aiuc.GenerateImpactUseCase
	mitigationUC     *aiuc.GenerateMitigationUseCase
	minutesUC        *aiuc.GenerateMinutesUseCase
	transcriptUC     *aiuc.AnalyzeTranscriptUseCase
	predictiveUC     *aiuc.GeneratePredictiveUseCase
	riskSuggestionUC *aiuc.GenerateRiskSuggestionsUseCase
	kriUC            *aiuc.GenerateKRIUseCase
}

// NewAIHandler creates a new AI handler
func NewAIHandler(
	fishboneUC *aiuc.GenerateFishboneUseCase,
	impactUC *aiuc.GenerateImpactUseCase,
	mitigationUC *aiuc.GenerateMitigationUseCase,
	minutesUC *aiuc.GenerateMinutesUseCase,
	transcriptUC *aiuc.AnalyzeTranscriptUseCase,
	predictiveUC *aiuc.GeneratePredictiveUseCase,
	riskSuggestionUC *aiuc.GenerateRiskSuggestionsUseCase,
	kriUC *aiuc.GenerateKRIUseCase,
) *AIHandler {
	return &AIHandler{
		fishboneUC:       fishboneUC,
		impactUC:         impactUC,
		mitigationUC:     mitigationUC,
		minutesUC:        minutesUC,
		transcriptUC:     transcriptUC,
		predictiveUC:     predictiveUC,
		riskSuggestionUC: riskSuggestionUC,
		kriUC:            kriUC,
	}
}

// GenerateCauseRequest represents request for fishbone generation
type GenerateCauseRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// GenerateImpactRequest represents request for impact generation
type GenerateImpactRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// GenerateMitigationRequest represents request for mitigation generation
type GenerateMitigationRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Cause       string `json:"cause,omitempty"`
	Impact      string `json:"impact,omitempty"`
}

// GenerateCause handles POST /api/v1/ai/causes
func (h *AIHandler) GenerateCause(c *fiber.Ctx) error {
	// 1. Parse request
	var req GenerateCauseRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// 2. Execute use case
	result, err := h.fishboneUC.Execute(c.Context(), aiuc.GenerateFishboneInput{
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}

// GenerateImpact handles POST /api/v1/ai/impacts
func (h *AIHandler) GenerateImpact(c *fiber.Ctx) error {
	// 1. Parse request
	var req GenerateImpactRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// 2. Execute use case
	result, err := h.impactUC.Execute(c.Context(), aiuc.GenerateImpactInput{
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{
		"impactDescription": result,
	})
}

// GenerateMitigation handles POST /api/v1/ai/mitigations
func (h *AIHandler) GenerateMitigation(c *fiber.Ctx) error {
	// 1. Parse request
	var req GenerateMitigationRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// 2. Execute use case
	result, err := h.mitigationUC.Execute(c.Context(), aiuc.GenerateMitigationInput{
		Title:       req.Title,
		Description: req.Description,
		Cause:       req.Cause,
		Impact:      req.Impact,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}

// GenerateMinutesRequest represents request for meeting minutes generation
type GenerateMinutesRequest struct {
	Transcript string `json:"transcript"`
}

// GenerateMinutes handles POST /api/v1/ai/minutes
func (h *AIHandler) GenerateMinutes(c *fiber.Ctx) error {
	// 1. Parse request
	var req GenerateMinutesRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// 2. Execute use case
	result, err := h.minutesUC.Execute(c.Context(), aiuc.GenerateMinutesInput{
		Transcript: req.Transcript,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}

// AnalyzeTranscriptRequest represents request for transcript analysis
type AnalyzeTranscriptRequest struct {
	Transcript string `json:"transcript"`
}

// GenerateTranscript handles POST /api/v1/ai/transcripts
func (h *AIHandler) GenerateTranscript(c *fiber.Ctx) error {
	// 1. Parse request
	var req AnalyzeTranscriptRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// 2. Execute use case
	result, err := h.transcriptUC.Execute(c.Context(), aiuc.AnalyzeTranscriptInput{
		Transcript: req.Transcript,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}

// GeneratePredictive handles POST /api/v1/ai/predictive-analyses
func (h *AIHandler) GeneratePredictive(c *fiber.Ctx) error {
	// 1. Parse request - accept risks as array
	var risks []entity.Risk
	if err := c.BodyParser(&risks); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// 2. Execute use case
	result, err := h.predictiveUC.Execute(c.Context(), aiuc.GeneratePredictiveInput{
		Risks: risks,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}

// GenerateRiskSuggestion handles POST /api/v1/ai/risk-suggestions
func (h *AIHandler) GenerateRiskSuggestion(c *fiber.Ctx) error {
	// 1. Execute use case (no input needed)
	result, err := h.riskSuggestionUC.Execute(c.Context(), aiuc.GenerateRiskSuggestionsInput{})
	if err != nil {
		return handleError(c, err)
	}

	// 2. Return response
	return c.JSON(fiber.Map{"data": result})
}

// GenerateKRIRequest represents request for KRI generation
type GenerateKRIRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// GenerateKRI handles POST /api/v1/ai/kris
func (h *AIHandler) GenerateKRI(c *fiber.Ctx) error {
	// 1. Parse request
	var req GenerateKRIRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	// 2. Execute use case
	result, err := h.kriUC.Execute(c.Context(), aiuc.GenerateKRIInput{
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}
