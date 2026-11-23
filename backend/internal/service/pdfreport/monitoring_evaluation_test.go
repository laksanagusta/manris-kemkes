package pdfreport

import (
	"bytes"
	"context"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestRenderFormalMonitoringEvaluationReport(t *testing.T) {
	renderer := NewPDFReportRenderer().(*pdfReportRenderer)
	data := &entity.KMKFormalReportData{
		Report: &entity.FormalReport{
			ReportType: entity.FormalReportTypeMonitoringEvaluation,
			Period:     "2025-H2",
		},
		MonitoringEvaluationReport: &entity.MonitoringEvaluationReportData{
			OrganizationName: "Balai Contoh",
			Year:             "2025",
			SemesterLabel:    "SEMESTER II",
			DocumentChecklist: []entity.MonitoringEvaluationChecklistRow{
				{No: "1", Item: "Kebijakan yang mendasari penerapan manajemen risiko"},
			},
			InfrastructureChecklist: []entity.MonitoringEvaluationChecklistRow{
				{No: "1.a", Item: "Kepemimpinan"},
			},
			ResultChecklist: []entity.MonitoringEvaluationChecklistRow{
				{No: "1", Item: "Efektivitas aktivitas penanganan risiko"},
			},
			MitigationSummary: []entity.MonitoringEvaluationMitigationSummaryRow{
				{No: "1", LevelLabel: "Risiko Sangat Tinggi", RiskCount: 1, MitigationPlanCount: 1, MitigationRealizationCount: 1},
				{LevelLabel: "Jumlah", RiskCount: 1, Total: true},
			},
		},
	}

	bytesOut, err := renderer.RenderFormal(context.Background(), data)
	if err != nil {
		t.Fatalf("RenderFormal() error = %v", err)
	}
	if len(bytesOut) == 0 {
		t.Fatal("expected non-empty PDF bytes")
	}
	if !bytes.Contains(bytesOut, []byte("LAPORAN HASIL PEMANTAUAN DAN EVALUASI")) {
		t.Fatal("PDF bytes missing monitoring evaluation title")
	}
	if !bytes.Contains(bytesOut, []byte("Format pemantauan pelaksanaan mitigasi risiko")) {
		t.Fatal("PDF bytes missing mitigation section label")
	}
}

func TestRenderFormalMonitoringEvaluationReportOmitsGenericPageNumbers(t *testing.T) {
	renderer := NewPDFReportRenderer().(*pdfReportRenderer)
	data := &entity.KMKFormalReportData{
		Report: &entity.FormalReport{
			ReportType: entity.FormalReportTypeMonitoringEvaluation,
			Period:     "2025-H2",
		},
		MonitoringEvaluationReport: &entity.MonitoringEvaluationReportData{
			OrganizationName: "Balai Contoh",
			Year:             "2025",
			SemesterLabel:    "SEMESTER II",
		},
	}

	bytesOut, err := renderer.RenderFormal(context.Background(), data)
	if err != nil {
		t.Fatalf("RenderFormal() error = %v", err)
	}
	if bytes.Contains(bytesOut, []byte("Halaman ")) {
		t.Fatal("monitoring evaluation reference style should not include generic page numbers")
	}
}

func TestRenderMonitoringEvaluationRecommendations(t *testing.T) {
	const conclusion = "Risiko menetap tercatat."
	const recommendation = "Lengkapi bukti mitigasi."
	for _, tt := range []struct {
		name  string
		value string
	}{
		{name: "blank"},
		{name: "whitespace", value: " \n\t "},
		{name: "entered", value: recommendation},
	} {
		t.Run(tt.name, func(t *testing.T) {
			renderer := NewPDFReportRenderer().(*pdfReportRenderer)
			pdf, err := renderer.RenderFormal(context.Background(), &entity.KMKFormalReportData{
				MonitoringEvaluationReport: &entity.MonitoringEvaluationReportData{
					MitigationConclusion: conclusion,
					Recommendations:      tt.value,
				},
			})
			if err != nil {
				t.Fatal(err)
			}
			wantRecommendation := tt.value == recommendation
			for _, value := range []string{"10. Saran Perbaikan", recommendation} {
				if bytes.Contains(pdf, []byte(value)) != wantRecommendation {
					t.Errorf("PDF contains %q = %v, want %v", value, !wantRecommendation, wantRecommendation)
				}
			}
			if !bytes.Contains(pdf, []byte(conclusion)) || bytes.Contains(pdf, []byte("diharapkan tim kerja")) {
				t.Error("PDF should keep the mitigation conclusion and omit the preset recommendation")
			}
		})
	}
}

func TestMonitoringChecklistTableRowsUseAutomaticHeight(t *testing.T) {
	rows := buildMonitoringChecklistTableRows([]string{"No", "Dokumen", "Ya", "Tidak", "Uraian Kondisi", "Keterangan"}, []entity.MonitoringEvaluationChecklistRow{
		{
			No:          "1",
			Item:        "Kebijakan yang mendasari penerapan manajemen risiko",
			Yes:         true,
			Condition:   "Sesuai",
			Description: "Permenkes 1354 Tahun 2024\nBuku Pedoman Manrisk\nhttps://drive.google.com/drive/folders/long-reference-path",
		},
	})
	if len(rows) != 2 {
		t.Fatalf("rows = %d, want header and one body row", len(rows))
	}

	bodyStructure := rows[1].GetStructure()
	if bodyStructure.GetData().Value != 0.0 {
		t.Fatalf("body row height = %v, want automatic height", bodyStructure.GetData().Value)
	}
}
