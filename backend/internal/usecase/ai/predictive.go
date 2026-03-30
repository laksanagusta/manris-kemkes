package ai

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// GeneratePredictiveInput represents input for predictive risk scoring
type GeneratePredictiveInput struct {
	Risks []entity.Risk
}

// GeneratePredictiveUseCase handles predictive risk scoring
type GeneratePredictiveUseCase struct {
	aiRepo repository.AIRepository
}

// NewGeneratePredictiveUseCase creates a new generate predictive use case
func NewGeneratePredictiveUseCase(aiRepo repository.AIRepository) *GeneratePredictiveUseCase {
	return &GeneratePredictiveUseCase{
		aiRepo: aiRepo,
	}
}

// Execute generates predictive risk scoring based on historical data
func (uc *GeneratePredictiveUseCase) Execute(ctx context.Context, input GeneratePredictiveInput) ([]entity.PredictiveRisk, error) {
	// 1. Validate input (empty risks is ok, will return empty result)
	if len(input.Risks) == 0 {
		return []entity.PredictiveRisk{}, nil
	}

	// 2. Call AI repository
	predictions, err := uc.aiRepo.GeneratePredictive(ctx, input.Risks)
	if err != nil {
		return nil, err
	}

	return predictions, nil
}
