package ai

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateRiskSuggestionsInput represents input for risk suggestions
type GenerateRiskSuggestionsInput struct {
	// No input needed - fetches existing risks internally
}

// GenerateRiskSuggestionsUseCase handles risk suggestion generation
type GenerateRiskSuggestionsUseCase struct {
	aiRepo repository.AIRepository
}

// NewGenerateRiskSuggestionsUseCase creates a new generate risk suggestions use case
func NewGenerateRiskSuggestionsUseCase(aiRepo repository.AIRepository) *GenerateRiskSuggestionsUseCase {
	return &GenerateRiskSuggestionsUseCase{
		aiRepo: aiRepo,
	}
}

// Execute generates unique risk suggestions different from existing ones
func (uc *GenerateRiskSuggestionsUseCase) Execute(ctx context.Context, input GenerateRiskSuggestionsInput) (*entity.RiskSuggestions, error) {
	// 1. Call AI repository (it will fetch existing risks internally)
	suggestions, err := uc.aiRepo.GenerateRiskSuggestions(ctx)
	if err != nil {
		return nil, err
	}

	return suggestions, nil
}
