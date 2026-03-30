package ai

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateFishboneInput represents input for fishbone generation
type GenerateFishboneInput struct {
	Title       string
	Description string
}

// GenerateFishboneUseCase handles fishbone diagram generation
type GenerateFishboneUseCase struct {
	aiRepo repository.AIRepository
}

// NewGenerateFishboneUseCase creates a new fishbone use case
func NewGenerateFishboneUseCase(aiRepo repository.AIRepository) *GenerateFishboneUseCase {
	return &GenerateFishboneUseCase{
		aiRepo: aiRepo,
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

	analysis, err := uc.aiRepo.GenerateFishbone(ctx, req)
	if err != nil {
		return nil, err
	}

	return analysis, nil
}
