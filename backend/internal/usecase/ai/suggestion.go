package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateRiskSuggestionsInput represents input for risk suggestions
type GenerateRiskSuggestionsInput struct {
	OrgIDs         []uuid.UUID
	OrganizationID *uuid.UUID
}

// GenerateRiskSuggestionsUseCase handles risk suggestion generation
type GenerateRiskSuggestionsUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewGenerateRiskSuggestionsUseCase creates a new generate risk suggestions use case
func NewGenerateRiskSuggestionsUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *GenerateRiskSuggestionsUseCase {
	return &GenerateRiskSuggestionsUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
	}
}

// Execute generates unique risk suggestions different from existing ones
func (uc *GenerateRiskSuggestionsUseCase) Execute(ctx context.Context, input GenerateRiskSuggestionsInput) (*entity.RiskSuggestions, error) {
	// 1. Call AI repository (it will fetch existing risks internally)
	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	suggestions, err := uc.aiRepo.GenerateRiskSuggestions(ctx, orgContext)
	if err != nil {
		return nil, err
	}

	return suggestions, nil
}
