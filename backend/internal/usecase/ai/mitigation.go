package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateMitigationInput represents input for mitigation generation
type GenerateMitigationInput struct {
	Title          string
	Description    string
	Cause          string
	Impact         string
	OrganizationID *uuid.UUID
}

// GenerateMitigationUseCase handles mitigation recommendation generation
type GenerateMitigationUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewGenerateMitigationUseCase creates a new mitigation use case
func NewGenerateMitigationUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *GenerateMitigationUseCase {
	return &GenerateMitigationUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
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

	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	actions, err := uc.aiRepo.GenerateMitigation(ctx, req, orgContext)
	if err != nil {
		return nil, err
	}

	return actions, nil
}
