package ai

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// GeneratePredictiveInput represents input for predictive risk scoring
type GeneratePredictiveInput struct {
	Risks          []entity.Risk
	OrganizationID *uuid.UUID
}

// GeneratePredictiveUseCase handles predictive risk scoring
type GeneratePredictiveUseCase struct {
	aiRepo  repository.AIRepository
	orgRepo repository.OrganizationRepository
}

// NewGeneratePredictiveUseCase creates a new generate predictive use case
func NewGeneratePredictiveUseCase(aiRepo repository.AIRepository, orgRepo repository.OrganizationRepository) *GeneratePredictiveUseCase {
	return &GeneratePredictiveUseCase{
		aiRepo:  aiRepo,
		orgRepo: orgRepo,
	}
}

// Execute generates predictive risk scoring based on historical data
func (uc *GeneratePredictiveUseCase) Execute(ctx context.Context, input GeneratePredictiveInput) ([]entity.PredictiveRisk, error) {
	// 1. Validate input (empty risks is ok, will return empty result)
	if len(input.Risks) == 0 {
		return []entity.PredictiveRisk{}, nil
	}

	// 2. Call AI repository
	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	predictions, err := uc.aiRepo.GeneratePredictive(ctx, input.Risks, orgContext)
	if err != nil {
		return nil, err
	}

	return predictions, nil
}
