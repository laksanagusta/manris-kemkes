package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateImpactInput represents input for impact generation
type GenerateImpactInput struct {
	Title          string
	Description    string
	OrganizationID *uuid.UUID
}

// GenerateImpactUseCase handles impact description generation
type GenerateImpactUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewGenerateImpactUseCase creates a new impact use case
func NewGenerateImpactUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *GenerateImpactUseCase {
	return &GenerateImpactUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
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

	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	impact, err := uc.aiRepo.GenerateImpact(ctx, req, orgContext)
	if err != nil {
		return "", err
	}

	return impact, nil
}
