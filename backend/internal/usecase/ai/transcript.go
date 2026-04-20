package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// AnalyzeTranscriptInput represents input for transcript analysis
type AnalyzeTranscriptInput struct {
	Transcript     string
	OrganizationID *uuid.UUID
}

// AnalyzeTranscriptUseCase handles transcript analysis
type AnalyzeTranscriptUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewAnalyzeTranscriptUseCase creates a new analyze transcript use case
func NewAnalyzeTranscriptUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *AnalyzeTranscriptUseCase {
	return &AnalyzeTranscriptUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
	}
}

// Execute analyzes meeting transcript and extracts risk suggestions
func (uc *AnalyzeTranscriptUseCase) Execute(ctx context.Context, input AnalyzeTranscriptInput) (*entity.TranscriptAnalysis, error) {
	// 1. Validate input
	if input.Transcript == "" {
		return nil, errors.ErrInvalidInput
	}

	// 2. Call AI repository
	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	analysis, err := uc.aiRepo.AnalyzeTranscript(ctx, input.Transcript, orgContext)
	if err != nil {
		return nil, err
	}

	return analysis, nil
}
