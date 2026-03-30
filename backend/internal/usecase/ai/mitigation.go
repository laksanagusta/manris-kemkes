package ai

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateMitigationInput represents input for mitigation generation
type GenerateMitigationInput struct {
	Title       string
	Description string
	Cause       string
	Impact      string
}

// GenerateMitigationUseCase handles mitigation recommendation generation
type GenerateMitigationUseCase struct {
	aiRepo repository.AIRepository
}

// NewGenerateMitigationUseCase creates a new mitigation use case
func NewGenerateMitigationUseCase(aiRepo repository.AIRepository) *GenerateMitigationUseCase {
	return &GenerateMitigationUseCase{
		aiRepo: aiRepo,
	}
}

// Execute generates mitigation recommendations
func (uc *GenerateMitigationUseCase) Execute(ctx context.Context, input GenerateMitigationInput) (entity.MitigationAction, error) {
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
		Cause:       input.Cause,
		Impact:      input.Impact,
	}

	actions, err := uc.aiRepo.GenerateMitigation(ctx, req)
	if err != nil {
		return nil, err
	}

	return actions, nil
}
