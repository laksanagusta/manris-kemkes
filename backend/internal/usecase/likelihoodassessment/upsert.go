package likelihoodassessment

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type UpsertUseCase struct {
	repo repository.LikelihoodAssessmentRepository
}

func NewUpsertUseCase(repo repository.LikelihoodAssessmentRepository) *UpsertUseCase {
	return &UpsertUseCase{repo: repo}
}

type UpsertInput struct {
	RiskID                   uuid.UUID `json:"riskId"`
	Method                   string    `json:"method"`
	FrequencyType            string    `json:"frequencyType"`
	ObservationPeriodMonths  int       `json:"observationPeriodMonths"`
	EventCount               *int      `json:"eventCount,omitempty"`
	PopulationCount          *int      `json:"populationCount,omitempty"`
	SelectedProbabilityLevel int       `json:"selectedProbabilityLevel"`
	Justification            string    `json:"justification"`
	DataSource               string    `json:"dataSource"`
}

type UpsertOutput struct {
	ID                       uuid.UUID `json:"id"`
	CalculatedProbability    *float64  `json:"calculatedProbability,omitempty"`
	SelectedProbabilityLevel int      `json:"selectedProbabilityLevel"`
	RecommendedLevel         int      `json:"recommendedLevel"`
}

func (uc *UpsertUseCase) Execute(ctx context.Context, input UpsertInput) (*UpsertOutput, error) {
	// Calculate recommended probability level using domain function
	eventCount := 0
	if input.EventCount != nil {
		eventCount = *input.EventCount
	}
	populationCount := 0
	if input.PopulationCount != nil {
		populationCount = *input.PopulationCount
	}
	recommendedLevel := entity.ResolveLikelihoodLevel(
		input.Method,
		input.FrequencyType,
		eventCount,
		populationCount,
		input.ObservationPeriodMonths,
	)

	// Calculate numeric probability for storage
	var calculated *float64
	if input.Method == "frequency" || input.Method == "probability" {
		cp := float64(recommendedLevel)
		calculated = &cp
	}

	assessment := entity.LikelihoodAssessment{
		RiskID:                   input.RiskID,
		Method:                   input.Method,
		FrequencyType:            input.FrequencyType,
		ObservationPeriodMonths:  input.ObservationPeriodMonths,
		EventCount:               input.EventCount,
		PopulationCount:          input.PopulationCount,
		CalculatedProbability:    calculated,
		SelectedProbabilityLevel: input.SelectedProbabilityLevel,
		Justification:            input.Justification,
		DataSource:               input.DataSource,
	}

	if err := assessment.Validate(); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	if err := uc.repo.UpsertByRiskID(ctx, &assessment); err != nil {
		return nil, err
	}

	return &UpsertOutput{
		ID:                       assessment.ID,
		CalculatedProbability:    calculated,
		SelectedProbabilityLevel: input.SelectedProbabilityLevel,
		RecommendedLevel:         recommendedLevel,
	}, nil
}
