package http

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/usecase/likelihoodassessment"
)

type LikelihoodAssessmentHandler struct {
	upsertUC *likelihoodassessment.UpsertUseCase
	getUC    *likelihoodassessment.GetByRiskIDUseCase
}

func NewLikelihoodAssessmentHandler(
	upsertUC *likelihoodassessment.UpsertUseCase,
	getUC *likelihoodassessment.GetByRiskIDUseCase,
) *LikelihoodAssessmentHandler {
	return &LikelihoodAssessmentHandler{
		upsertUC: upsertUC,
		getUC:    getUC,
	}
}

func (h *LikelihoodAssessmentHandler) Upsert(c *fiber.Ctx) error {
	var input likelihoodassessment.UpsertInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if input.RiskID == uuid.Nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "riskId is required",
		})
	}

	output, err := h.upsertUC.Execute(c.Context(), input)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(output)
}

func (h *LikelihoodAssessmentHandler) GetByRiskID(c *fiber.Ctx) error {
	riskIDStr := c.Params("riskId")
	riskID, err := uuid.Parse(riskIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid riskId format",
		})
	}

	assessment, err := h.getUC.Execute(c.Context(), riskID)
	if err != nil {
		if errors.Is(err, likelihoodassessment.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "likelihood assessment not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(assessment)
}

// ListByRiskIDs returns multiple likelihood assessments for a list of risk IDs.
// Used for preloading assessments in bulk queries.
func (h *LikelihoodAssessmentHandler) ListByRiskIDs(c *fiber.Ctx) error {
	riskIDsParam := c.Query("riskIds")
	if riskIDsParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "riskIds query parameter is required",
		})
	}

	// Parse comma-separated UUIDs
	idStrs := splitAndTrim(riskIDsParam, ",")
	riskIDs := make([]uuid.UUID, 0, len(idStrs))
	for _, s := range idStrs {
		id, err := uuid.Parse(s)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid riskId in list: " + s,
			})
		}
		riskIDs = append(riskIDs, id)
	}

	// For now, fetch one by one — could optimize with IN clause if needed
	assessments := make([]map[string]interface{}, 0, len(riskIDs))
	for _, riskID := range riskIDs {
		assessment, err := h.getUC.Execute(c.Context(), riskID)
		if err != nil {
			if errors.Is(err, likelihoodassessment.ErrNotFound) {
				continue // skip missing
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		assessments = append(assessments, map[string]interface{}{
			"riskId":              assessment.RiskID.String(),
			"method":              assessment.Method,
			"frequencyType":      assessment.FrequencyType,
			"selectedProbabilityLevel": assessment.SelectedProbabilityLevel,
			"justification":       assessment.Justification,
			"dataSource":          assessment.DataSource,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": assessments,
		"total": len(assessments),
	})
}

func splitAndTrim(s string, sep string) []string {
	parts := make([]string, 0)
	for _, p := range splitString(s, sep) {
		trimmed := trimString(p)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func splitString(s string, sep string) []string {
	result := make([]string, 0)
	start := 0
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i = start - 1
		}
	}
	result = append(result, s[start:])
	return result
}

func trimString(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

func parseInt(s string) int {
	v, _ := strconv.Atoi(s)
	return v
}
