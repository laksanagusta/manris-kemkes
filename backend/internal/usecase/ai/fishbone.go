package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateFishboneInput represents input for fishbone generation
type GenerateFishboneInput struct {
	Title          string
	Description    string
	OrganizationID *uuid.UUID
}

// GenerateFishboneUseCase handles fishbone diagram generation
type GenerateFishboneUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewGenerateFishboneUseCase creates a new fishbone use case
func NewGenerateFishboneUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *GenerateFishboneUseCase {
	return &GenerateFishboneUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
	}
}

// Execute generates fishbone analysis
func (uc *GenerateFishboneUseCase) Execute(ctx context.Context, input GenerateFishboneInput) (*entity.FishboneAnalysis, error) {
	// 1. Validate input
	if input.Title == "" {
		return nil, errors.ErrInvalidTitle
	}
	if input.Description == "" {
		return nil, errors.ErrInvalidDescription
	}

	// 2. Call AI repository
	req := entity.AIRequest{
		Title:       input.Title,
		Description: input.Description,
	}

	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	analysis, err := uc.aiRepo.GenerateFishbone(ctx, req, orgContext)
	if err != nil {
		return nil, err
	}

	return analysis, nil
}
