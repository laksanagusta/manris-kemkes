package openai

import (
	"strings"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestBuildDocumentIntelligencePromptStrategicIncludesHierarchy(t *testing.T) {
	repo := &aiRepository{}

	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{
		Mode:           entity.DocumentModeStrategicObjectiveRisk,
		Filename:       "renstra.pdf",
		Period:         "2026-H1",
		DocumentText:   "Sasaran meningkatnya deteksi dini. IKU cakupan laporan tepat waktu 90%.",
		ObjectivesJSON: `[{"id":"obj-1","sasaran":"Meningkatnya deteksi dini","indikatorKinerjaUtama":"Cakupan laporan tepat waktu"}]`,
	})

	for _, fragment := range []string{
		`"objectives": [`,
		`"ikus": [`,
		`"suggestedRisks": [`,
		`"roTitle": "RO"`,
		`relatedObjectiveText`,
		`relatedIkuText`,
		`sourceRefs`,
	} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}

func TestBuildDocumentIntelligencePromptMitigationIncludesOpenTasks(t *testing.T) {
	repo := &aiRepository{}

	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{
		Mode:          entity.DocumentModeMitigationReportMapper,
		Filename:      "laporan.xlsx",
		Period:        "2026-H1",
		DocumentText:  "Checklist sudah digunakan dan laporan mingguan telah disampaikan.",
		OpenTasksJSON: `[{"id":"task-1","riskCode":"R-001","riskTitle":"Keterlambatan laporan","mitigationAction":"Susun checklist mingguan","periodLabel":"2026-H1"}]`,
	})

	for _, fragment := range []string{
		`"taskMatches": [`,
		`"progressPct": 100`,
		`"reportNotes": "Ringkasan pelaporan yang bisa dipakai"`,
		`Jangan isi evidenceUrl`,
		`Hanya gunakan taskId dari daftar task open`,
	} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}

func TestBuildDocumentIntelligencePromptAuditIncludesFindings(t *testing.T) {
	repo := &aiRepository{}

	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{
		Mode:              entity.DocumentModeAuditFindingMapper,
		Filename:          "audit.pdf",
		Period:            "2025-H2",
		DocumentText:      "Temuan dokumen pendukung belum lengkap.",
		ExistingRisksJSON: `[{"id":"risk-1","code":"R-001","title":"Dokumen tidak lengkap"}]`,
	})

	for _, fragment := range []string{
		`"findings": [`,
		`"mappingStatus": "map_to_existing|create_new_risk|needs_review"`,
		`"suggestedRisk": {`,
		`existingRiskId`,
		`sourceRefs`,
	} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}

func TestParseDocumentIntelligenceResultAcceptsUnwrappedStrategicResult(t *testing.T) {
	result, err := parseDocumentIntelligenceResult(entity.DocumentModeStrategicObjectiveRisk, `{
		"objectives": [
			{
				"clientKey": "obj-1",
				"tujuan": "Meningkatkan layanan",
				"sasaran": "Sasaran A",
				"confidence": 90,
				"sourceRefs": [],
				"ikus": [
					{
						"clientKey": "iku-1",
						"name": "IKU A",
						"confidence": 80,
						"sourceRefs": [],
						"suggestedRisks": []
					}
				]
			}
		]
	}`)
	if err != nil {
		t.Fatalf("expected parse to succeed: %v", err)
	}
	if result.Strategic == nil || len(result.Strategic.Objectives) != 1 {
		t.Fatalf("expected strategic objective result, got %#v", result)
	}
	if result.Strategic.Objectives[0].IKUs[0].Name != "IKU A" {
		t.Fatalf("unexpected IKU name: %q", result.Strategic.Objectives[0].IKUs[0].Name)
	}
}

func TestParseDocumentIntelligenceResultAcceptsStringMitigationActions(t *testing.T) {
	result, err := parseDocumentIntelligenceResult(entity.DocumentModeStrategicObjectiveRisk, `{
		"objectives": [
			{
				"clientKey": "obj-1",
				"tujuan": "Tujuan",
				"sasaran": "Sasaran",
				"confidence": 90,
				"sourceRefs": [],
				"ikus": [
					{
						"clientKey": "iku-1",
						"name": "IKU A",
						"confidence": 80,
						"sourceRefs": [],
						"suggestedRisks": [
							{
								"clientKey": "risk-1",
								"title": "Risiko",
								"description": "Deskripsi",
								"category": "operasional",
								"riskSource": "internal",
								"cause": [],
								"impactDesc": [],
								"probability": 3,
								"impact": 4,
								"treatmentOption": "mitigate",
								"mitigations": ["Aksi satu", "Aksi dua"],
								"reasoning": "Alasan",
								"confidence": 80,
								"sourceRefs": []
							}
						]
					}
				]
			}
		]
	}`)
	if err != nil {
		t.Fatalf("expected parse to succeed: %v", err)
	}

	risks := result.Strategic.Objectives[0].IKUs[0].SuggestedRisks
	if len(risks) != 1 || len(risks[0].Mitigations) != 2 {
		t.Fatalf("expected string mitigations to be converted, got %#v", risks)
	}
	if risks[0].Mitigations[0].Action != "Aksi satu" {
		t.Fatalf("unexpected mitigation action: %q", risks[0].Mitigations[0].Action)
	}
}

func TestParseDocumentIntelligenceResultAcceptsWrappedStrategicResult(t *testing.T) {
	result, err := parseDocumentIntelligenceResult(entity.DocumentModeStrategicObjectiveRisk, `{
		"mode": "strategic_objective_risk",
		"strategic": {
			"objectives": [
				{
					"clientKey": "obj-1",
					"tujuan": "Tujuan",
					"sasaran": "Sasaran",
					"confidence": 90,
					"sourceRefs": [],
					"ikus": []
				}
			]
		}
	}`)
	if err != nil {
		t.Fatalf("expected parse to succeed: %v", err)
	}
	if result.Strategic == nil || len(result.Strategic.Objectives) != 1 {
		t.Fatalf("expected wrapped strategic objective result, got %#v", result)
	}
}

func TestParseDocumentIntelligenceResultRejectsEmptyResponse(t *testing.T) {
	_, err := parseDocumentIntelligenceResult(entity.DocumentModeStrategicObjectiveRisk, "   ")
	if err == nil {
		t.Fatal("expected empty response error")
	}
	if !strings.Contains(err.Error(), "empty response") {
		t.Fatalf("expected empty response error, got %v", err)
	}
}
