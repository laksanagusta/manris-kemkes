package ai

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type fakeDocumentAIRepo struct {
	lastReq entity.DocumentAnalysisRequest
	result  *entity.DocumentIntelligenceResult
	err     error
	calls   int
}

func (r *fakeDocumentAIRepo) AnalyzeDocument(_ context.Context, req entity.DocumentAnalysisRequest) (*entity.DocumentIntelligenceResult, error) {
	r.calls++
	r.lastReq = req
	return r.result, r.err
}

type fakeDocumentTaskRepo struct {
	tasks        []entity.DocumentMitigationTaskContext
	orgIDs       []uuid.UUID
	limit, calls int
	err          error
}

func (r *fakeDocumentTaskRepo) ListForDocumentAnalysis(_ context.Context, orgIDs []uuid.UUID, limit int) ([]entity.DocumentMitigationTaskContext, error) {
	r.calls++
	r.orgIDs, r.limit = orgIDs, limit
	return r.tasks, r.err
}

func TestAnalyzeDocumentIntelligenceRejectsInvalidMode(t *testing.T) {
	for _, mode := range []string{"bad_mode", "audit_finding_mapper", "strategic_objective_risk"} {
		t.Run(mode, func(t *testing.T) {
			ai := &fakeDocumentAIRepo{}
			_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, nil).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{Mode: entity.DocumentAnalysisMode(mode), DocumentText: "dokumen"})
			if !errors.Is(err, domainerrors.ErrInvalidInput) || ai.calls != 0 {
				t.Fatal("removed or unknown mode must be rejected before provider access")
			}
		})
	}
}

func TestAnalyzeDocumentIntelligenceRejectsEmptyDocument(t *testing.T) {
	ai := &fakeDocumentAIRepo{}
	_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, nil).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{Mode: entity.DocumentModeSOPRiskUniverse, DocumentText: "  "})
	if !errors.Is(err, domainerrors.ErrDocumentUnreadable) || ai.calls != 0 {
		t.Fatal("empty input reached provider")
	}
}

func TestSensitiveDocumentNeverLoadsContextOrCallsAI(t *testing.T) {
	for _, mode := range []entity.DocumentAnalysisMode{entity.DocumentModeSOPRiskUniverse, entity.DocumentModeRiskEventExtraction, entity.DocumentModeMitigationReportMapper} {
		t.Run(string(mode), func(t *testing.T) {
			ai, tasks := &fakeDocumentAIRepo{}, &fakeDocumentTaskRepo{}
			_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, tasks).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
				Mode: mode, DocumentText: "Email pasien: private-synthetic@example.test",
			})
			if !errors.Is(err, domainerrors.ErrSensitiveDataDetected) || ai.calls != 0 || tasks.calls != 0 {
				t.Fatal("sensitive document was not blocked before context loading and external AI")
			}
		})
	}
}

func TestSensitiveMitigationContextNeverCallsAI(t *testing.T) {
	orgID := uuid.New()
	tasks := &fakeDocumentTaskRepo{tasks: []entity.DocumentMitigationTaskContext{{
		ID: uuid.NewString(), RiskCode: "R-001", PeriodLabel: "2026-Q4", MitigationAction: "Hubungi private-synthetic@example.test",
	}}}
	ai := &fakeDocumentAIRepo{}
	_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, tasks).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "Laporan pelaksanaan checklist.", OrganizationID: &orgID, Period: "2026-Q4",
	})
	if !errors.Is(err, domainerrors.ErrSensitiveDataDetected) || ai.calls != 0 || tasks.calls != 1 {
		t.Fatal("sensitive database context reached external AI")
	}
	if strings.Contains(err.Error(), "private-synthetic@example.test") || !strings.Contains(err.Error(), "data tugas") {
		t.Fatal("context error must give safe, context-specific recovery instructions")
	}
}

func TestDocumentExtractionSendsOnlySourceText(t *testing.T) {
	for _, mode := range []entity.DocumentAnalysisMode{entity.DocumentModeSOPRiskUniverse, entity.DocumentModeRiskEventExtraction} {
		t.Run(string(mode), func(t *testing.T) {
			ai := &fakeDocumentAIRepo{result: &entity.DocumentIntelligenceResult{SOP: &entity.SOPRiskUniverseResult{}, Kejadian: &entity.RiskEventExtractionResult{}}}
			// No organization, risk or objective repository is needed; even the task repo is absent.
			_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, nil).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
				Mode: mode, DocumentText: "Fakta dokumen lengkap.", Period: "PRIVATE-PERIOD", OrgIDs: []uuid.UUID{uuid.New()},
			})
			if err != nil {
				t.Fatal(err)
			}
			if ai.lastReq.DocumentText != "Fakta dokumen lengkap." || ai.lastReq.Period != "" || ai.lastReq.OpenTasksJSON != "" {
				t.Fatal("extraction must only pass source text and mode")
			}
		})
	}
}

func TestDocumentMitigationContextIsScopedAndMinimal(t *testing.T) {
	orgID := uuid.New()
	task := entity.DocumentMitigationTaskContext{ID: uuid.NewString(), RiskCode: "R-001", RiskTitle: "Terlambat laporan", MitigationAction: "Susun checklist", PeriodLabel: "2026-Q4"}
	tasks := &fakeDocumentTaskRepo{tasks: []entity.DocumentMitigationTaskContext{task}}
	ai := &fakeDocumentAIRepo{result: &entity.DocumentIntelligenceResult{Mitigation: &entity.MitigationReportMapperResult{TaskMatches: []entity.MitigationTaskReportSuggestion{{TaskID: task.ID, Confidence: 180, SourceRefs: []entity.DocumentSourceRef{{Quote: " checklist dipakai "}}}}}}}
	result, err := NewAnalyzeDocumentIntelligenceUseCase(ai, tasks).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "checklist dipakai", OrganizationID: &orgID, OrgIDs: []uuid.UUID{uuid.New()}, Period: "IGNORED-LEGACY-PERIOD",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(tasks.orgIDs) != 1 || tasks.orgIDs[0] != orgID || tasks.limit != 51 {
		t.Fatal("candidate scope/limit was not applied")
	}
	if ai.lastReq.Period != "2026-Q4" {
		t.Fatal("period must be derived from active task context, not caller input")
	}
	var payload []map[string]any
	if err := json.Unmarshal([]byte(ai.lastReq.OpenTasksJSON), &payload); err != nil {
		t.Fatal(err)
	}
	allowed := map[string]bool{"id": true, "riskCode": true, "riskTitle": true, "mitigationAction": true, "periodLabel": true}
	if len(payload) != 1 || len(payload[0]) != len(allowed) {
		t.Fatal("unexpected task context shape")
	}
	for key := range payload[0] {
		if !allowed[key] {
			t.Fatalf("unnecessary field sent: %s", key)
		}
	}
	match := result.Mitigation.TaskMatches[0]
	if match.Confidence != 100 || match.ClientKey == "" || match.SourceRefs[0].Quote != "checklist dipakai" {
		t.Fatal("result normalization was lost")
	}
}

func TestDocumentMitigationStopsBeforeSendingUnboundedContext(t *testing.T) {
	orgID := uuid.New()
	valid := entity.DocumentMitigationTaskContext{ID: uuid.NewString(), PeriodLabel: "2026-Q4"}
	cases := []struct {
		name   string
		orgIDs []uuid.UUID
		period string
		tasks  []entity.DocumentMitigationTaskContext
		err    error
	}{
		{name: "missing organization", period: "2026-Q4"},
		{name: "multiple organizations", orgIDs: []uuid.UUID{orgID, uuid.New()}, period: "2026-Q4"},
		{name: "no candidates", orgIDs: []uuid.UUID{orgID}, period: "2026-Q4"},
		{name: "too many candidates", orgIDs: []uuid.UUID{orgID}, period: "2026-Q4", tasks: make([]entity.DocumentMitigationTaskContext, 51)},
		{name: "oversized context", orgIDs: []uuid.UUID{orgID}, period: "2026-Q4", tasks: []entity.DocumentMitigationTaskContext{{ID: uuid.NewString(), MitigationAction: strings.Repeat("x", maxDocumentTaskContextBytes)}}},
		{name: "database failure", orgIDs: []uuid.UUID{orgID}, period: "2026-Q4", tasks: []entity.DocumentMitigationTaskContext{valid}, err: errors.New("database unavailable")},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ai := &fakeDocumentAIRepo{}
			tasks := &fakeDocumentTaskRepo{tasks: tc.tasks, err: tc.err}
			_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, tasks).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "dokumen", OrgIDs: tc.orgIDs, Period: tc.period})
			if err == nil || ai.calls != 0 {
				t.Fatal("blocked context reached external provider")
			}
		})
	}
}

func TestDocumentMitigationPreservesAllFiftyCandidates(t *testing.T) {
	orgID := uuid.New()
	tasks := make([]entity.DocumentMitigationTaskContext, 50)
	for i := range tasks {
		tasks[i] = entity.DocumentMitigationTaskContext{ID: uuid.NewString(), PeriodLabel: "2026-Q4", MitigationAction: "Checklist"}
	}
	ai := &fakeDocumentAIRepo{result: &entity.DocumentIntelligenceResult{Mitigation: &entity.MitigationReportMapperResult{}}}
	_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, &fakeDocumentTaskRepo{tasks: tasks}).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "Dokumen sumber", OrganizationID: &orgID, Period: "2026-Q4",
	})
	if err != nil {
		t.Fatal(err)
	}
	var sent []entity.DocumentMitigationTaskContext
	if err := json.Unmarshal([]byte(ai.lastReq.OpenTasksJSON), &sent); err != nil {
		t.Fatal(err)
	}
	if len(sent) != len(tasks) {
		t.Fatal("candidate list was silently truncated")
	}
	for i := range tasks {
		if sent[i].ID != tasks[i].ID {
			t.Fatal("candidate identity was lost")
		}
	}
}

func TestNormalizeDocumentRiskSuggestionMapsEnumsAndClampsScores(t *testing.T) {
	got := normalizeDocumentRiskSuggestion(entity.DocumentRiskSuggestion{
		Title:           " Risiko Strategis ",
		Category:        "strategis",
		RiskSource:      "external",
		TreatmentOption: "mitigasi",
		Probability:     9,
		Impact:          0,
		Confidence:      120,
		SourceRefs: []entity.DocumentSourceRef{
			{Quote: "  kutipan  ", Location: " Halaman 1 "},
			{Quote: " ", Location: "  "},
		},
	})

	if got.Category != entity.RiskCategoryKebijakan {
		t.Fatalf("expected strategic category to map to kebijakan, got %q", got.Category)
	}
	if got.RiskSource != "eksternal" {
		t.Fatalf("expected external to map to eksternal, got %q", got.RiskSource)
	}
	if got.TreatmentOption != "mitigate" {
		t.Fatalf("expected treatment option mitigate, got %q", got.TreatmentOption)
	}
	if got.Probability != 5 {
		t.Fatalf("expected probability clamped to 5, got %d", got.Probability)
	}
	if got.Impact != 1 {
		t.Fatalf("expected impact clamped to 1, got %d", got.Impact)
	}
	if got.Confidence != 100 {
		t.Fatalf("expected confidence clamped to 100, got %d", got.Confidence)
	}
	if got.ClientKey == "" {
		t.Fatal("expected client key to be generated from title")
	}
	if len(got.SourceRefs) != 1 || got.SourceRefs[0].Quote != "kutipan" {
		t.Fatalf("expected source refs to be trimmed and filtered, got %+v", got.SourceRefs)
	}
}

func TestDocumentMitigationUsesEachActiveRiskPeriodWithoutCalendarGuessing(t *testing.T) {
	orgID := uuid.New()
	tasks := []entity.DocumentMitigationTaskContext{
		{ID: uuid.NewString(), RiskCode: "R-001", PeriodLabel: "2026-Q4"},
		{ID: uuid.NewString(), RiskCode: "R-002", PeriodLabel: "2026-Q3"},
	}
	ai := &fakeDocumentAIRepo{result: &entity.DocumentIntelligenceResult{Mitigation: &entity.MitigationReportMapperResult{}}}
	_, err := NewAnalyzeDocumentIntelligenceUseCase(ai, &fakeDocumentTaskRepo{tasks: tasks}).Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "Dokumen laporan", OrganizationID: &orgID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if ai.lastReq.Period != "2026-Q3, 2026-Q4" {
		t.Fatal("active profiles from different risk families must retain their actual periods")
	}
	var sent []entity.DocumentMitigationTaskContext
	if err := json.Unmarshal([]byte(ai.lastReq.OpenTasksJSON), &sent); err != nil {
		t.Fatal(err)
	}
	if len(sent) != 2 || sent[0].PeriodLabel != tasks[0].PeriodLabel || sent[1].PeriodLabel != tasks[1].PeriodLabel {
		t.Fatal("period resolution discarded an active risk or rewrote its task period")
	}
}
