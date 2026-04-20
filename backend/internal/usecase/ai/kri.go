package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateKRIInput represents input for KRI generation
type GenerateKRIInput struct {
	Title          string
	Description    string
	OrganizationID *uuid.UUID
}

// GenerateKRIUseCase handles KRI suggestion generation
type GenerateKRIUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewGenerateKRIUseCase creates a new KRI generation use case
func NewGenerateKRIUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *GenerateKRIUseCase {
	return &GenerateKRIUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
	}
}

// Execute generates KRI suggestions for a risk
func (uc *GenerateKRIUseCase) Execute(ctx context.Context, input GenerateKRIInput) (*entity.KRISuggestions, error) {
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

	suggestions, err := uc.aiRepo.GenerateKRI(ctx, req, orgContext)
	if err != nil {
		return nil, err
	}

	return suggestions, nil
}
