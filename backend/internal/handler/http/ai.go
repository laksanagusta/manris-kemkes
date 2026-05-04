package http

import (
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	"github.com/manris/backend/internal/service/documenttext"
	aiuc "github.com/manris/backend/internal/usecase/ai"
)

// scopeOrgID extracts the OrganizationID from an AccessScope, returning nil if scope is nil.
func scopeOrgID(scope *entity.AccessScope) *uuid.UUID {
	if scope == nil {
		return nil
	}
	return scope.OrganizationID
}

// AIHandler handles AI-related HTTP requests using clean architecture
type AIHandler struct {
	fishboneUC             *aiuc.GenerateFishboneUseCase
	impactUC               *aiuc.GenerateImpactUseCase
	mitigationUC           *aiuc.GenerateMitigationUseCase
	minutesUC              *aiuc.GenerateMinutesUseCase
	transcriptUC           *aiuc.AnalyzeTranscriptUseCase
	applyRiskChangeUC      *aiuc.ApplyTranscriptRiskChangesUseCase
	predictiveUC           *aiuc.GeneratePredictiveUseCase
	riskSuggestionUC       *aiuc.GenerateRiskSuggestionsUseCase
	kriUC                  *aiuc.GenerateKRIUseCase
	incidentBatchUC        *aiuc.GenerateIncidentBatchExtractionUseCase
	incidentRiskUC         *aiuc.GenerateManualIncidentRiskSuggestionsUseCase
	documentIntelligenceUC *aiuc.AnalyzeDocumentIntelligenceUseCase
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
	documentIntelligenceUC *aiuc.AnalyzeDocumentIntelligenceUseCase,
) *AIHandler {
	return &AIHandler{
		fishboneUC:             fishboneUC,
		impactUC:               impactUC,
		mitigationUC:           mitigationUC,
		minutesUC:              minutesUC,
		transcriptUC:           transcriptUC,
		applyRiskChangeUC:      applyRiskChangeUC,
		predictiveUC:           predictiveUC,
		riskSuggestionUC:       riskSuggestionUC,
		kriUC:                  kriUC,
		incidentBatchUC:        incidentBatchUC,
		incidentRiskUC:         incidentRiskUC,
		documentIntelligenceUC: documentIntelligenceUC,
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

	scope := middleware.GetAccessScope(c)

	// 2. Execute use case
	result, err := h.fishboneUC.Execute(c.Context(), aiuc.GenerateFishboneInput{
		Title:          req.Title,
		Description:    req.Description,
		OrganizationID: scopeOrgID(scope),
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

	scope := middleware.GetAccessScope(c)

	// 2. Execute use case
	result, err := h.impactUC.Execute(c.Context(), aiuc.GenerateImpactInput{
		Title:          req.Title,
		Description:    req.Description,
		OrganizationID: scopeOrgID(scope),
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

	scope := middleware.GetAccessScope(c)

	// 2. Execute use case
	result, err := h.mitigationUC.Execute(c.Context(), aiuc.GenerateMitigationInput{
		Title:          req.Title,
		Description:    req.Description,
		Cause:          req.Cause,
		Impact:         req.Impact,
		OrganizationID: scopeOrgID(scope),
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

	scope := middleware.GetAccessScope(c)

	// 2. Execute use case
	result, err := h.minutesUC.Execute(c.Context(), aiuc.GenerateMinutesInput{
		Transcript:     req.Transcript,
		OrganizationID: scopeOrgID(scope),
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

	scope := middleware.GetAccessScope(c)

	// 2. Execute use case
	result, err := h.transcriptUC.Execute(c.Context(), aiuc.AnalyzeTranscriptInput{
		Transcript:     req.Transcript,
		OrganizationID: scopeOrgID(scope),
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

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}
	var orgIDs []uuid.UUID
	if !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.applyRiskChangeUC.Execute(c.Context(), aiuc.ApplyTranscriptRiskChangesInput{
		TargetRiskID:    targetRiskID,
		ActorID:         actorID,
		ActorRole:       role,
		SelectedChanges: req.SelectedChanges,
		OrgIDs:          orgIDs,
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
		Risks:          risks,
		OrganizationID: scopeOrgID(middleware.GetAccessScope(c)),
	})
	if err != nil {
		return handleError(c, err)
	}

	// 3. Return response
	return c.JSON(fiber.Map{"data": result})
}

// GenerateRiskSuggestion handles POST /api/v1/ai/risk-suggestions
func (h *AIHandler) GenerateRiskSuggestion(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}
	var orgIDs []uuid.UUID
	if !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.riskSuggestionUC.Execute(c.Context(), aiuc.GenerateRiskSuggestionsInput{
		OrgIDs:         orgIDs,
		OrganizationID: scope.OrganizationID,
	})
	if err != nil {
		return handleError(c, err)
	}

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

	scope := middleware.GetAccessScope(c)

	// 2. Execute use case
	result, err := h.kriUC.Execute(c.Context(), aiuc.GenerateKRIInput{
		Title:          req.Title,
		Description:    req.Description,
		OrganizationID: scopeOrgID(scope),
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

	documentText, err := extractTextFromPDF(fileHeader)
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

// AnalyzeDocumentIntelligence handles POST /api/v1/ai/document-intelligence/analyze
func (h *AIHandler) AnalyzeDocumentIntelligence(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "file is required")
	}

	if fileHeader.Size > 10*1024*1024 {
		return sendProblemDetails(c, fiber.StatusRequestEntityTooLarge, "File Too Large", "https://api.manris.com/errors/file-too-large", domainerrors.ErrFileTooLarge.Error())
	}

	if !isDocumentIntelligenceFile(fileHeader.Filename) {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/invalid-file-type", "only PDF and XLSX files are supported")
	}

	mode := entity.DocumentAnalysisMode(strings.TrimSpace(c.FormValue("mode")))
	if !entity.IsValidDocumentAnalysisMode(mode) {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid document analysis mode")
	}

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}

	var requestedOrgID *uuid.UUID
	var orgIDs []uuid.UUID
	if orgIDStr := strings.TrimSpace(c.FormValue("organizationId")); orgIDStr != "" {
		parsedOrgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if !scope.IsGlobal {
			if _, err := scope.NarrowToOrg(parsedOrgID); err != nil {
				return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "insufficient permissions")
			}
		}
		requestedOrgID = &parsedOrgID
		orgIDs = []uuid.UUID{parsedOrgID}
	} else if !scope.IsGlobal {
		requestedOrgID = scope.OrganizationID
		orgIDs = append([]uuid.UUID(nil), scope.AccessibleOrgIDs...)
	}

	documentResult, err := extractDocumentFromUpload(fileHeader)
	if err != nil {
		return handleError(c, err)
	}

	result, err := h.documentIntelligenceUC.Execute(c.Context(), aiuc.AnalyzeDocumentIntelligenceInput{
		Mode:           mode,
		DocumentText:   documentResult.Text,
		Filename:       fileHeader.Filename,
		Period:         strings.TrimSpace(c.FormValue("period")),
		OrganizationID: requestedOrgID,
		OrgIDs:         orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"mode": mode,
			"document": fiber.Map{
				"filename":   fileHeader.Filename,
				"textLength": documentResult.Length,
				"warnings":   documentResult.Warnings,
			},
			"result": result,
		},
	})
}

func isPDFFile(filename, contentType string) bool {
	if strings.EqualFold(contentType, "application/pdf") {
		return true
	}

	return strings.EqualFold(filepath.Ext(filename), ".pdf")
}

func extractDocumentFromUpload(fileHeader *multipart.FileHeader) (*documenttext.ExtractResult, error) {
	src, err := fileHeader.Open()
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to open uploaded file")
	}
	defer src.Close()

	content, err := io.ReadAll(src)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to read uploaded file")
	}

	return documenttext.Extract(documenttext.ExtractInput{
		Filename: fileHeader.Filename,
		Content:  content,
		MaxChars: documenttext.DefaultMaxChars,
	})
}

func extractTextFromPDF(fileHeader *multipart.FileHeader) (string, error) {
	result, err := extractDocumentFromUpload(fileHeader)
	if err != nil {
		return "", err
	}
	return result.Text, nil
}

func isDocumentIntelligenceFile(filename string) bool {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".pdf", ".xlsx":
		return true
	default:
		return false
	}
}
