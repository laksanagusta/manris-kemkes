package ai

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// AnalyzeTranscriptInput represents input for transcript analysis
type AnalyzeTranscriptInput struct {
	Transcript string
}

// AnalyzeTranscriptUseCase handles transcript analysis
type AnalyzeTranscriptUseCase struct {
	aiRepo repository.AIRepository
}

// NewAnalyzeTranscriptUseCase creates a new analyze transcript use case
func NewAnalyzeTranscriptUseCase(aiRepo repository.AIRepository) *AnalyzeTranscriptUseCase {
	return &AnalyzeTranscriptUseCase{
		aiRepo: aiRepo,
	}
}

// Execute analyzes meeting transcript and extracts risk suggestions
func (uc *AnalyzeTranscriptUseCase) Execute(ctx context.Context, input AnalyzeTranscriptInput) (*entity.TranscriptAnalysis, error) {
	// 1. Validate input
	if input.Transcript == "" {
		return nil, errors.ErrInvalidInput
	}

	// 2. Call AI repository
	analysis, err := uc.aiRepo.AnalyzeTranscript(ctx, input.Transcript)
	if err != nil {
		return nil, err
	}

	return analysis, nil
}
