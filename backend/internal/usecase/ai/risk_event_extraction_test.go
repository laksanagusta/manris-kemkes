package ai

import (
	"context"
	"github.com/manris/backend/internal/domain/entity"
	"testing"
)

func TestRiskEventExtractionPreservesMissingFactsAndMergesExactCandidates(t *testing.T) {
	item := entity.RiskEventExtractionItem{Event: entity.RiskEventDraft{Description: "Layanan berhenti", OccurredAt: "2026-10", Severity: "major", ImpactTypes: []string{"unsupported"}}, SourceRefs: []entity.DocumentSourceRef{{Quote: "Layanan berhenti", Location: "Halaman 1"}}, Confidence: 150}
	result := &entity.RiskEventExtractionResult{Items: []entity.RiskEventExtractionItem{item, item, {Event: entity.RiskEventDraft{Description: "Peristiwa lain"}, SourceRefs: []entity.DocumentSourceRef{{Quote: "kutipan palsu"}}}}}
	normalizeRiskEventExtraction(result, "Layanan\nberhenti")
	if len(result.Items) != 1 {
		t.Fatalf("items = %d, want 1", len(result.Items))
	}
	got := result.Items[0]
	if got.Event.OccurredAt != "" || got.Event.Severity != "" || len(got.Event.ImpactTypes) != 0 || got.Event.FinancialLossKnown != nil {
		t.Fatalf("missing facts received defaults: %+v", got.Event)
	}
	if got.Confidence != 100 || len(got.ClientKey) != 64 || len(got.MissingFields) < 3 {
		t.Fatalf("invalid review metadata: %+v", got)
	}
	if len(got.SourceRefs) != 2 {
		t.Fatalf("supporting quotes were lost: %+v", got.SourceRefs)
	}
}

func TestRiskEventExtractionKeepsDifferentEventsSeparate(t *testing.T) {
	result := &entity.RiskEventExtractionResult{Items: []entity.RiskEventExtractionItem{
		{Event: entity.RiskEventDraft{Description: "Layanan berhenti", OccurredAt: "2026-10-01"}, SourceRefs: []entity.DocumentSourceRef{{Quote: "Layanan berhenti"}}},
		{Event: entity.RiskEventDraft{Description: "Layanan berhenti", OccurredAt: "2026-10-02"}, SourceRefs: []entity.DocumentSourceRef{{Quote: "Layanan berhenti"}}},
	}}
	normalizeRiskEventExtraction(result, "Layanan berhenti")
	if len(result.Items) != 2 || result.Items[0].ClientKey == result.Items[1].ClientKey {
		t.Fatal("different occurrences merged")
	}
}

func TestRiskEventModeDoesNotLoadRegisterOrMitigationTasks(t *testing.T) {
	ai := &fakeDocumentAIRepo{result: &entity.DocumentIntelligenceResult{Kejadian: &entity.RiskEventExtractionResult{Items: []entity.RiskEventExtractionItem{}}}}
	uc := NewAnalyzeDocumentIntelligenceUseCase(ai, nil, nil, nil, nil)
	result, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{Mode: entity.DocumentModeRiskEventExtraction, DocumentText: "Tidak ada kejadian", Filename: "laporan.pdf"})
	if err != nil || result.Kejadian == nil {
		t.Fatalf("Execute = %+v, %v", result, err)
	}
	if ai.lastReq.ExistingRisksJSON != "" || ai.lastReq.OpenTasksJSON != "" {
		t.Fatal("unexpected mapping context")
	}
}
