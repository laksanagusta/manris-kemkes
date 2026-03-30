package cba

import (
	"context"
	"fmt"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// RecommendVariablesInput represents input for variable recommendation
type RecommendVariablesInput struct {
	RiskDescription string
}

// RecommendVariablesUseCase handles AI-driven CBA variable recommendation
type RecommendVariablesUseCase struct {
	cbaRepo repository.CBARepository
}

// NewRecommendVariablesUseCase creates a new recommend variables use case
func NewRecommendVariablesUseCase(cbaRepo repository.CBARepository) *RecommendVariablesUseCase {
	return &RecommendVariablesUseCase{
		cbaRepo: cbaRepo,
	}
}

// Execute generates CBA variable recommendations from a risk description
func (uc *RecommendVariablesUseCase) Execute(ctx context.Context, input RecommendVariablesInput) (*entity.CBARecommendation, error) {
	if input.RiskDescription == "" {
		return nil, fmt.Errorf("risk description is required")
	}

	recommendation, err := uc.cbaRepo.RecommendVariables(ctx, input.RiskDescription)
	if err != nil {
		return nil, fmt.Errorf("failed to generate recommendations: %w", err)
	}

	return recommendation, nil
}
