package openai

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestRiskDocumentExtractionPromptSupportsDocumentsWithoutProcessStages(t *testing.T) {
	repo := &aiRepository{}
	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{
		Mode:         entity.DocumentModeSOPRiskUniverse,
		DocumentText: "Anggaran kegiatan berkurang sehingga target layanan berpotensi tidak tercapai.",
	})
	for _, required := range []string{
		"berbagai jenis dokumen", "laporan", "kontrak", "notulen",
		"tidak harus memiliki alur atau tahapan proses", "bagian atau topik dokumen",
		"Jangan mengarang tahapan proses", "processStages", "suggestedRisks", "sourceRefs",
	} {
		if !strings.Contains(prompt, required) {
			t.Fatalf("prompt missing %q", required)
		}
	}
	if strings.Contains(prompt, "SOP") {
		t.Fatal("generic document risk extraction prompt must not mention SOP")
	}
}

func TestBuildDocumentIntelligencePromptMitigationIncludesOpenTasks(t *testing.T) {
	repo := &aiRepository{}
	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{
		Mode: entity.DocumentModeMitigationReportMapper, Period: "2026-Q4", DocumentText: "Checklist sudah digunakan.",
		OpenTasksJSON: `[{"id":"task-1","riskCode":"R-001","riskTitle":"Keterlambatan laporan","mitigationAction":"Susun checklist","periodLabel":"2026-Q4"}]`,
	})
	for _, fragment := range []string{`"taskMatches": [`, `Jangan isi evidenceUrl`, `Hanya gunakan taskId`, `task-1`, `Dokumen sumber`} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("missing %q", fragment)
		}
	}
}

func TestParseDocumentIntelligenceSupportedResults(t *testing.T) {
	cases := []struct {
		name    string
		mode    entity.DocumentAnalysisMode
		content string
	}{
		{"risk", entity.DocumentModeSOPRiskUniverse, `{"processStages":[]}`},
		{"wrapped risk", entity.DocumentModeSOPRiskUniverse, `{"sop":{"processStages":[]}}`},
		{"mitigation", entity.DocumentModeMitigationReportMapper, `{"taskMatches":[]}`},
		{"wrapped mitigation", entity.DocumentModeMitigationReportMapper, `{"mitigation":{"taskMatches":[]}}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := parseDocumentIntelligenceResult(tc.mode, tc.content)
			if err != nil || result.Mode != tc.mode {
				t.Fatalf("parse = %+v, %v", result, err)
			}
		})
	}
}

func TestRemovedDocumentModesAreRejected(t *testing.T) {
	for _, mode := range []string{"audit_finding_mapper", "strategic_objective_risk"} {
		t.Run(mode, func(t *testing.T) {
			if result, err := parseDocumentIntelligenceResult(entity.DocumentAnalysisMode(mode), `{"sop":{"processStages":[]}}`); err == nil || result != nil {
				t.Fatal("removed mode was parsed")
			}
			// Invalid mode must win over the deliberately missing client configuration.
			if result, err := (&aiRepository{}).AnalyzeDocument(t.Context(), entity.DocumentAnalysisRequest{Mode: entity.DocumentAnalysisMode(mode), DocumentText: "dokumen"}); err == nil || result != nil || !strings.Contains(err.Error(), "mode analisis") {
				t.Fatal("removed mode reached provider")
			}
		})
	}
}

func TestDocumentRiskSuggestionAcceptsStringAndObjectMitigations(t *testing.T) {
	for _, mitigations := range []string{`["Susun checklist"]`, `[{"action":"Susun checklist"}]`} {
		t.Run(mitigations, func(t *testing.T) {
			var suggestion entity.DocumentRiskSuggestion
			if err := json.Unmarshal([]byte(`{"title":"Risiko","mitigations":`+mitigations+`}`), &suggestion); err != nil {
				t.Fatal(err)
			}
			if len(suggestion.Mitigations) != 1 || suggestion.Mitigations[0].Action != "Susun checklist" {
				t.Fatal("mitigation compatibility was lost")
			}
		})
	}
}

func TestParseDocumentIntelligenceResultRejectsEmptyResponse(t *testing.T) {
	result, err := parseDocumentIntelligenceResult(entity.DocumentModeSOPRiskUniverse, "   ")
	if err == nil || result != nil {
		t.Fatal("empty response accepted")
	}
}

func TestParseRiskEventExtraction(t *testing.T) {
	for _, content := range []string{`{"items":[]}`, `{"kejadian":{"items":[]}}`} {
		result, err := parseDocumentIntelligenceResult(entity.DocumentModeRiskEventExtraction, content)
		if err != nil || result.Kejadian == nil || len(result.Kejadian.Items) != 0 {
			t.Fatalf("parse = %+v, %v", result, err)
		}
	}
}

func TestRiskEventExtractionPromptRequiresFactsAndManualLinks(t *testing.T) {
	repo := &aiRepository{}
	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{Mode: entity.DocumentModeRiskEventExtraction, DocumentText: "Layanan berhenti"})
	for _, required := range []string{"SUDAH TERJADI", "Hanya fakta eksplisit", "near miss", "Risiko dipilih manual", "Gabungkan penyebutan berulang", "sourceRefs", "Dokumen sumber"} {
		if !strings.Contains(prompt, required) {
			t.Fatalf("prompt missing %q", required)
		}
	}
}
