package repository

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

// AIRepository defines the interface for AI operations
type AIRepository interface {
	// GenerateFishbone generates root cause analysis using fishbone diagram
	GenerateFishbone(ctx context.Context, req entity.AIRequest) (*entity.FishboneAnalysis, error)

	// GenerateImpact generates impact description for a risk
	GenerateImpact(ctx context.Context, req entity.AIRequest) (string, error)

	// GenerateMitigation generates mitigation action recommendations
	GenerateMitigation(ctx context.Context, req entity.AIRequest) (entity.MitigationAction, error)

	// GenerateMeetingMinutes generates structured meeting minutes from transcript
	GenerateMeetingMinutes(ctx context.Context, transcript string) (*entity.MeetingMinutes, error)

	// AnalyzeTranscript analyzes meeting transcript and extracts risk suggestions
	AnalyzeTranscript(ctx context.Context, transcript string) (*entity.TranscriptAnalysis, error)

	// GeneratePredictive generates predictive risk scoring based on historical data
	GeneratePredictive(ctx context.Context, risks []entity.Risk) ([]entity.PredictiveRisk, error)

	// GenerateRiskSuggestions generates unique risk suggestions different from existing ones
	GenerateRiskSuggestions(ctx context.Context) (*entity.RiskSuggestions, error)

	// GenerateKRI generates KRI suggestions based on a risk's title and description
	GenerateKRI(ctx context.Context, req entity.AIRequest) (*entity.KRISuggestions, error)

	// GenerateIncidentBatchExtraction extracts multiple incident candidates from a PDF-derived text document.
	GenerateIncidentBatchExtraction(ctx context.Context, req entity.IncidentExtractionRequest) (*entity.IncidentBatchExtraction, error)

	// GenerateManualIncidentRiskSuggestions suggests related risks for a single manual incident input.
	GenerateManualIncidentRiskSuggestions(ctx context.Context, req entity.ManualIncidentRiskSuggestionRequest) ([]entity.IncidentRiskSuggestion, error)
}
