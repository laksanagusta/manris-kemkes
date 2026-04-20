package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateMinutesInput represents input for meeting minutes generation
type GenerateMinutesInput struct {
	Transcript     string
	OrganizationID *uuid.UUID
}

// GenerateMinutesUseCase handles meeting minutes generation
type GenerateMinutesUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewGenerateMinutesUseCase creates a new generate minutes use case
func NewGenerateMinutesUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *GenerateMinutesUseCase {
	return &GenerateMinutesUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
	}
}

// Execute generates meeting minutes from transcript
func (uc *GenerateMinutesUseCase) Execute(ctx context.Context, input GenerateMinutesInput) (*entity.MeetingMinutes, error) {
	// 1. Validate input
	if input.Transcript == "" {
		return nil, errors.ErrInvalidInput
	}

	// 2. Call AI repository
	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	minutes, err := uc.aiRepo.GenerateMeetingMinutes(ctx, input.Transcript, orgContext)
	if err != nil {
		return nil, err
	}

	return minutes, nil
}
