package ai

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GenerateIncidentBatchExtractionUseCase extracts multiple incident candidates from a document.
type GenerateIncidentBatchExtractionUseCase struct {
	aiRepo repository.AIRepository
}

func NewGenerateIncidentBatchExtractionUseCase(aiRepo repository.AIRepository) *GenerateIncidentBatchExtractionUseCase {
	return &GenerateIncidentBatchExtractionUseCase{
		aiRepo: aiRepo,
	}
}

type GenerateIncidentBatchExtractionInput struct {
	DocumentText   string
	OrganizationID *uuid.UUID
}

func (uc *GenerateIncidentBatchExtractionUseCase) Execute(ctx context.Context, input GenerateIncidentBatchExtractionInput) (*entity.IncidentBatchExtraction, error) {
	if strings.TrimSpace(input.DocumentText) == "" {
		return nil, errors.ErrDocumentUnreadable
	}

	result, err := uc.aiRepo.GenerateIncidentBatchExtraction(ctx, entity.IncidentExtractionRequest{
		DocumentText:   input.DocumentText,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return nil, err
	}

	for i := range result.Items {
		result.Items[i].Incident.Severity = normalizeIncidentSeverity(result.Items[i].Incident.Severity)
		if strings.TrimSpace(result.Items[i].ClientKey) == "" {
			result.Items[i].ClientKey = uuid.NewString()
		}
	}

	return result, nil
}

func normalizeIncidentSeverity(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "critical", "kritis":
		return "critical"
	case "major", "tinggi":
		return "major"
	case "minor", "sedang":
		return "minor"
	case "insignificant", "rendah", "low":
		return "insignificant"
	default:
		return "minor"
	}
}
