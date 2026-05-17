package pdfreport

import (
	"bytes"
	"context"
	"testing"
	"time"

	"github.com/manris/backend/internal/domain/entity"
)

func TestRenderRiskDetail_ReturnsPDFBytes(t *testing.T) {
	renderer := NewPDFReportRenderer().(*pdfReportRenderer)
	data := &entity.RiskDetailPDFData{
		Title:                "Gangguan distribusi vaksin",
		Code:                 "R-001",
		Status:               entity.RiskStatusApproved,
		OrganizationName:     "Direktorat Contoh",
		CategoryLabel:        "Operasional",
		RiskSource:           "Internal",
		Controllability:      "Controllable",
		AssessmentCycle:      "2025-H2",
		Description:          "Distribusi vaksin dapat tertunda ketika rantai pasok terganggu.",
		Causes:               []string{"Cuaca ekstrem"},
		Impacts:              []string{"Pelayanan kesehatan tertunda"},
		ExistingControl:      "Jadwal distribusi terkoordinasi",
		ControlEffectiveness: "Efektif",
		Probability:          4,
		Impact:               4,
		Weight:               1.2,
		Nilai:                19.2,
		InherentScore:        19,
		RiskLevelLabel:       "Tinggi",
		RiskPriority:         2,
		RiskAppetite:         "Di atas batas selera risiko",
		IsRiskUtamaLabel:     "Ya",
		TreatmentOption:      "Mitigasi",
		ReviewSummary:        "Perlu penguatan pengawasan distribusi",
		TargetProbability:    2,
		TargetImpact:         3,
		TargetWeight:         1.0,
		TargetNilai:          6.0,
		Mitigations: []entity.Mitigation{
			{
				Action:                "Koordinasi vendor",
				Owner:                 "Tim logistik",
				ExecutionScheduleText: "Mingguan",
				DueDate:               strPtr("2025-12-31"),
				PotentialObstacle:     "Keterlambatan pengiriman",
			},
		},
		CreatedByName: "Petugas Contoh",
		CreatedAt:     time.Date(2026, 5, 3, 9, 15, 0, 0, time.UTC),
		UpdatedAt:     time.Date(2026, 5, 4, 11, 30, 0, 0, time.UTC),
	}

	bytesOut, err := renderer.RenderRiskDetail(context.Background(), data)
	if err != nil {
		t.Fatalf("RenderRiskDetail() error = %v", err)
	}
	if len(bytesOut) == 0 {
		t.Fatal("expected non-empty PDF bytes")
	}
	if !bytes.Contains(bytesOut, []byte("LAMPIRAN DETAIL RISIKO")) {
		t.Fatal("PDF bytes missing title")
	}
	if !bytes.Contains(bytesOut, []byte("Rencana Penanganan Risiko")) {
		t.Fatal("PDF bytes missing mitigation section")
	}
	if !bytes.Contains(bytesOut, []byte("Koordinasi vendor")) {
		t.Fatal("PDF bytes missing mitigation content")
	}
}

func strPtr(value string) *string {
	return &value
}
