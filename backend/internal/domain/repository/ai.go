package repository

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

// AIRepository defines the interface for AI operations
type AIRepository interface {
	// GenerateFishbone generates root cause analysis using fishbone diagram
	GenerateFishbone(ctx context.Context, req entity.AIRequest, orgContext string) (*entity.FishboneAnalysis, error)

	// GenerateImpact generates impact description for a risk
	GenerateImpact(ctx context.Context, req entity.AIRequest, orgContext string) (string, error)

	// GenerateMitigation generates mitigation action recommendations
	GenerateMitigation(ctx context.Context, req entity.AIRequest, orgContext string) (entity.MitigationAction, error)

	// GenerateMeetingMinutes generates structured meeting minutes from transcript
	GenerateMeetingMinutes(ctx context.Context, transcript string, orgContext string) (*entity.MeetingMinutes, error)

	// AnalyzeTranscript analyzes meeting transcript and extracts risk suggestions
	AnalyzeTranscript(ctx context.Context, transcript string, orgContext string) (*entity.TranscriptAnalysis, error)

	// GeneratePredictive generates predictive risk scoring based on historical data
	GeneratePredictive(ctx context.Context, risks []entity.Risk, orgContext string) ([]entity.PredictiveRisk, error)

	// GenerateRiskSuggestions generates unique risk suggestions different from existing ones
	GenerateRiskSuggestions(ctx context.Context, orgContext string) (*entity.RiskSuggestions, error)

	// GenerateKRI generates KRI suggestions based on a risk's title and description
	GenerateKRI(ctx context.Context, req entity.AIRequest, orgContext string) (*entity.KRISuggestions, error)

	// AnalyzeDocument analyzes a text-extracted document and returns structured intelligence results.
	AnalyzeDocument(ctx context.Context, req entity.DocumentAnalysisRequest, orgContext string) (*entity.DocumentIntelligenceResult, error)

	// GenerateIncidentBatchExtraction extracts multiple incident candidates from a PDF-derived text document.
	GenerateIncidentBatchExtraction(ctx context.Context, req entity.IncidentExtractionRequest, orgContext string) (*entity.IncidentBatchExtraction, error)

	// GenerateManualIncidentRiskSuggestions suggests related risks for a single manual incident input.
	GenerateManualIncidentRiskSuggestions(ctx context.Context, req entity.ManualIncidentRiskSuggestionRequest, orgContext string) ([]entity.IncidentRiskSuggestion, error)
}
