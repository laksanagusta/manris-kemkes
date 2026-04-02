package http

import (
	"fmt"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	aiuc "github.com/manris/backend/internal/usecase/ai"
)

// AIHandler handles AI-related HTTP requests using clean architecture
type AIHandler struct {
	fishboneUC        *aiuc.GenerateFishboneUseCase
	impactUC          *aiuc.GenerateImpactUseCase
	mitigationUC      *aiuc.GenerateMitigationUseCase
	minutesUC         *aiuc.GenerateMinutesUseCase
	transcriptUC      *aiuc.AnalyzeTranscriptUseCase
	applyRiskChangeUC *aiuc.ApplyTranscriptRiskChangesUseCase
	predictiveUC      *aiuc.GeneratePredictiveUseCase
	riskSuggestionUC  *aiuc.GenerateRiskSuggestionsUseCase
	kriUC             *aiuc.GenerateKRIUseCase
	incidentBatchUC   *aiuc.GenerateIncidentBatchExtractionUseCase
	incidentRiskUC    *aiuc.GenerateManualIncidentRiskSuggestionsUseCase
}

// NewAIHandler creates a new AI handler
func NewAIHandler(
	fishboneUC *aiuc.GenerateFishboneUseCase,
	impactUC *aiuc.GenerateImpactUseCase,
	mitigationUC *aiuc.GenerateMitigationUseCase,
	minutesUC *aiuc.GenerateMinutesUseCase,
	transcriptUC *aiuc.AnalyzeTranscriptUseCase,
	applyRiskChangeUC *aiuc.ApplyTranscriptRiskChangesUseCase,
	predictiveUC *aiuc.GeneratePredictiveUseCase,
	riskSuggestionUC *aiuc.GenerateRiskSuggestionsUseCase,
	kriUC *aiuc.GenerateKRIUseCase,
	incidentBatchUC *aiuc.GenerateIncidentBatchExtractionUseCase,
	incidentRiskUC *aiuc.GenerateManualIncidentRiskSuggestionsUseCase,
) *AIHandler {
	return &AIHandler{
		fishboneUC:        fishboneUC,
		impactUC:          impactUC,
		mitigationUC:      mitigationUC,
		minutesUC:         minutesUC,
		transcriptUC:      transcriptUC,
		applyRiskChangeUC: applyRiskChangeUC,
		predictiveUC:      predictiveUC,
		riskSuggestionUC:  riskSuggestionUC,
		kriUC:             kriUC,
		incidentBatchUC:   incidentBatchUC,
		incidentRiskUC:    incidentRiskUC,
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

type ApplyTranscriptRiskChangeRequest struct {
	TargetRiskID    string                        `json:"targetRiskId"`
	SelectedChanges []entity.TranscriptRiskChange `json:"selectedChanges"`
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

// ApplyTranscriptRiskChange handles POST /api/v1/ai/transcripts/apply-risk-change
func (h *AIHandler) ApplyTranscriptRiskChange(c *fiber.Ctx) error {
	var req ApplyTranscriptRiskChangeRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	userIDValue, ok := c.Locals("userId").(string)
	if !ok || strings.TrimSpace(userIDValue) == "" {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}
	role, ok := c.Locals("role").(string)
	if !ok || strings.TrimSpace(role) == "" {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	targetRiskID, err := uuid.Parse(req.TargetRiskID)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}
	actorID, err := uuid.Parse(userIDValue)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	result, err := h.applyRiskChangeUC.Execute(c.Context(), aiuc.ApplyTranscriptRiskChangesInput{
		TargetRiskID:    targetRiskID,
		ActorID:         actorID,
		ActorRole:       role,
		SelectedChanges: req.SelectedChanges,
	})
	if err != nil {
		return handleError(c, err)
	}

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

type GenerateManualIncidentRiskSuggestionRequest struct {
	Title          string     `json:"title"`
	What           string     `json:"what"`
	Who            string     `json:"who"`
	When           *time.Time `json:"when"`
	Where          string     `json:"where"`
	WhyHow         string     `json:"whyHow"`
	Severity       string     `json:"severity"`
	OrganizationID *uuid.UUID `json:"organizationId"`
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

// GenerateManualIncidentRiskSuggestions handles POST /api/v1/ai/incidents/suggest-risks
func (h *AIHandler) GenerateManualIncidentRiskSuggestions(c *fiber.Ctx) error {
	var req GenerateManualIncidentRiskSuggestionRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "Invalid request body")
	}

	result, err := h.incidentRiskUC.Execute(c.Context(), aiuc.GenerateManualIncidentRiskSuggestionsInput{
		Title:          req.Title,
		What:           req.What,
		Who:            req.Who,
		When:           req.When,
		Where:          req.Where,
		WhyHow:         req.WhyHow,
		Severity:       req.Severity,
		OrganizationID: req.OrganizationID,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// GenerateIncidentBatch handles POST /api/v1/ai/incidents/extract-batch
func (h *AIHandler) GenerateIncidentBatch(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "file is required")
	}

	if fileHeader.Size > 10*1024*1024 {
		return sendProblemDetails(c, fiber.StatusRequestEntityTooLarge, "File Too Large", "https://api.manris.com/errors/file-too-large", domainerrors.ErrFileTooLarge.Error())
	}

	if !isPDFFile(fileHeader.Filename, fileHeader.Header.Get("Content-Type")) {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/invalid-file-type", domainerrors.ErrInvalidFileType.Error())
	}

	documentText, err := extractTextFromPDF(c, fileHeader)
	if err != nil {
		return handleError(c, err)
	}

	var organizationID *uuid.UUID
	if orgIDStr := c.FormValue("organizationId"); orgIDStr != "" {
		parsedOrgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		organizationID = &parsedOrgID
	}

	result, err := h.incidentBatchUC.Execute(c.Context(), aiuc.GenerateIncidentBatchExtractionInput{
		DocumentText:   documentText,
		OrganizationID: organizationID,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func isPDFFile(filename, contentType string) bool {
	if strings.EqualFold(contentType, "application/pdf") {
		return true
	}

	return strings.EqualFold(filepath.Ext(filename), ".pdf")
}

func extractTextFromPDF(c *fiber.Ctx, fileHeader *multipart.FileHeader) (string, error) {
	src, err := fileHeader.Open()
	if err != nil {
		return "", domainerrors.Wrap(err, "failed to open uploaded file")
	}
	defer src.Close()

	tmpFile, err := os.CreateTemp("", "incident-upload-*.pdf")
	if err != nil {
		return "", domainerrors.Wrap(err, "failed to prepare temporary file")
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	if _, err := tmpFile.ReadFrom(src); err != nil {
		_ = tmpFile.Close()
		return "", domainerrors.Wrap(err, "failed to copy uploaded file")
	}
	if err := tmpFile.Close(); err != nil {
		return "", domainerrors.Wrap(err, "failed to finalize uploaded file")
	}

	cmd := exec.CommandContext(c.Context(), "pdftotext", "-layout", "-enc", "UTF-8", tmpPath, "-")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", domainerrors.Wrap(err, fmt.Sprintf("failed to extract PDF text: %s", string(output)))
	}

	text := strings.TrimSpace(string(output))
	if text == "" {
		return "", domainerrors.ErrDocumentUnreadable
	}

	return text, nil
}
