package ai

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GenerateManualIncidentRiskSuggestionsUseCase struct {
	aiRepo repository.AIRepository
}

func NewGenerateManualIncidentRiskSuggestionsUseCase(aiRepo repository.AIRepository) *GenerateManualIncidentRiskSuggestionsUseCase {
	return &GenerateManualIncidentRiskSuggestionsUseCase{aiRepo: aiRepo}
}

type GenerateManualIncidentRiskSuggestionsInput struct {
	Title          string
	What           string
	Who            string
	When           *time.Time
	Where          string
	WhyHow         string
	Severity       string
	OrganizationID *uuid.UUID
}

func (uc *GenerateManualIncidentRiskSuggestionsUseCase) Execute(ctx context.Context, input GenerateManualIncidentRiskSuggestionsInput) ([]entity.IncidentRiskSuggestion, error) {
	if strings.TrimSpace(input.What) == "" ||
		strings.TrimSpace(input.Who) == "" ||
		strings.TrimSpace(input.Where) == "" ||
		input.When == nil ||
		strings.TrimSpace(input.Severity) == "" {
		return nil, errors.ErrInvalidInput
	}

	return uc.aiRepo.GenerateManualIncidentRiskSuggestions(ctx, entity.ManualIncidentRiskSuggestionRequest{
		Title:          strings.TrimSpace(input.Title),
		What:           strings.TrimSpace(input.What),
		Who:            strings.TrimSpace(input.Who),
		When:           input.When,
		Where:          strings.TrimSpace(input.Where),
		WhyHow:         strings.TrimSpace(input.WhyHow),
		Severity:       normalizeIncidentSeverity(input.Severity),
		OrganizationID: input.OrganizationID,
	})
}
