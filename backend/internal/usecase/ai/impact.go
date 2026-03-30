package ai

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateImpactInput represents input for impact generation
type GenerateImpactInput struct {
	Title       string
	Description string
}

// GenerateImpactUseCase handles impact description generation
type GenerateImpactUseCase struct {
	aiRepo repository.AIRepository
}

// NewGenerateImpactUseCase creates a new impact use case
func NewGenerateImpactUseCase(aiRepo repository.AIRepository) *GenerateImpactUseCase {
	return &GenerateImpactUseCase{
		aiRepo: aiRepo,
	}
}

// Execute generates impact description
func (uc *GenerateImpactUseCase) Execute(ctx context.Context, input GenerateImpactInput) (string, error) {
	// 1. Validate input
	if input.Title == "" {
		return "", errors.ErrInvalidTitle
	}
	if input.Description == "" {
		return "", errors.ErrInvalidDescription
	}

	// 2. Call AI repository
	req := entity.AIRequest{
		Title:       input.Title,
		Description: input.Description,
	}

	impact, err := uc.aiRepo.GenerateImpact(ctx, req)
	if err != nil {
		return "", err
	}

	return impact, nil
}
