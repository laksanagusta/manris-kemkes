package ai

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateMinutesInput represents input for meeting minutes generation
type GenerateMinutesInput struct {
	Transcript string
}

// GenerateMinutesUseCase handles meeting minutes generation
type GenerateMinutesUseCase struct {
	aiRepo repository.AIRepository
}

// NewGenerateMinutesUseCase creates a new generate minutes use case
func NewGenerateMinutesUseCase(aiRepo repository.AIRepository) *GenerateMinutesUseCase {
	return &GenerateMinutesUseCase{
		aiRepo: aiRepo,
	}
}

// Execute generates meeting minutes from transcript
func (uc *GenerateMinutesUseCase) Execute(ctx context.Context, input GenerateMinutesInput) (*entity.MeetingMinutes, error) {
	// 1. Validate input
	if input.Transcript == "" {
		return nil, errors.ErrInvalidInput
	}

	// 2. Call AI repository
	minutes, err := uc.aiRepo.GenerateMeetingMinutes(ctx, input.Transcript)
	if err != nil {
		return nil, err
	}

	return minutes, nil
}
