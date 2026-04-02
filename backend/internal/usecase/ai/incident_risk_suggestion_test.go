package ai

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type fakeIncidentSuggestionAIRepository struct {
	lastRequest *entity.ManualIncidentRiskSuggestionRequest
	response    []entity.IncidentRiskSuggestion
	err         error
}

func (r *fakeIncidentSuggestionAIRepository) GenerateFishbone(context.Context, entity.AIRequest) (*entity.FishboneAnalysis, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GenerateImpact(context.Context, entity.AIRequest) (string, error) {
	return "", errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GenerateMitigation(context.Context, entity.AIRequest) (entity.MitigationAction, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GenerateMeetingMinutes(context.Context, string) (*entity.MeetingMinutes, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) AnalyzeTranscript(context.Context, string) (*entity.TranscriptAnalysis, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GeneratePredictive(context.Context, []entity.Risk) ([]entity.PredictiveRisk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GenerateRiskSuggestions(context.Context) (*entity.RiskSuggestions, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GenerateKRI(context.Context, entity.AIRequest) (*entity.KRISuggestions, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GenerateIncidentBatchExtraction(context.Context, entity.IncidentExtractionRequest) (*entity.IncidentBatchExtraction, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeIncidentSuggestionAIRepository) GenerateManualIncidentRiskSuggestions(_ context.Context, req entity.ManualIncidentRiskSuggestionRequest) ([]entity.IncidentRiskSuggestion, error) {
	r.lastRequest = &req
	return r.response, r.err
}

func TestGenerateManualIncidentRiskSuggestionsRejectsIncompleteInput(t *testing.T) {
	uc := NewGenerateManualIncidentRiskSuggestionsUseCase(&fakeIncidentSuggestionAIRepository{})

	_, err := uc.Execute(context.Background(), GenerateManualIncidentRiskSuggestionsInput{
		What:     "Gangguan sistem cold chain",
		Severity: "major",
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestGenerateManualIncidentRiskSuggestionsNormalizesSeverityAndPassesRequest(t *testing.T) {
	orgID := uuid.New()
	when := time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC)
	repo := &fakeIncidentSuggestionAIRepository{
		response: []entity.IncidentRiskSuggestion{{
			RiskID:     uuid.New(),
			RiskCode:   "R-001",
			RiskTitle:  "Gangguan rantai dingin",
			Reason:     "Kejadian berdampak pada penyimpanan vaksin.",
			Confidence: 87,
		}},
	}

	uc := NewGenerateManualIncidentRiskSuggestionsUseCase(repo)
	result, err := uc.Execute(context.Background(), GenerateManualIncidentRiskSuggestionsInput{
		Title:          "Gangguan genset gudang vaksin",
		What:           "Temperatur cold room meningkat di luar ambang batas.",
		Who:            "Petugas gudang vaksin",
		When:           &when,
		Where:          "Gudang vaksin pusat",
		WhyHow:         "Genset cadangan gagal menyala saat listrik padam.",
		Severity:       "kritis",
		OrganizationID: &orgID,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 suggestion, got %d", len(result))
	}
	if repo.lastRequest == nil {
		t.Fatal("expected repository request to be captured")
	}
	if repo.lastRequest.Severity != "critical" {
		t.Fatalf("expected normalized severity critical, got %q", repo.lastRequest.Severity)
	}
	if repo.lastRequest.OrganizationID == nil || *repo.lastRequest.OrganizationID != orgID {
		t.Fatalf("expected organization id %s, got %v", orgID, repo.lastRequest.OrganizationID)
	}
	if repo.lastRequest.When == nil || !repo.lastRequest.When.Equal(when) {
		t.Fatalf("expected when %s, got %v", when, repo.lastRequest.When)
	}
}
