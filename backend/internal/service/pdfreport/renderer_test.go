package pdfreport

import (
	"bytes"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/johnfercher/go-tree/node"
	marotorow "github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/core"
	coreentity "github.com/johnfercher/maroto/v2/pkg/core/entity"
	"github.com/johnfercher/maroto/v2/pkg/metrics"
	"github.com/manris/backend/internal/domain/entity"
)

type capturedMaroto struct {
	rows []core.Row
}

func (m *capturedMaroto) RegisterHeader(...core.Row) error { return nil }

func (m *capturedMaroto) RegisterFooter(...core.Row) error { return nil }

func (m *capturedMaroto) AddRows(rows ...core.Row) {
	m.rows = append(m.rows, rows...)
}

func (m *capturedMaroto) AddRow(rowHeight float64, cols ...core.Col) core.Row {
	return marotorow.New(rowHeight).Add(cols...)
}

func (m *capturedMaroto) AddAutoRow(cols ...core.Col) core.Row {
	return marotorow.New().Add(cols...)
}

func (m *capturedMaroto) FitlnCurrentPage(float64) bool { return false }

func (m *capturedMaroto) GetCurrentConfig() *coreentity.Config { return nil }

func (m *capturedMaroto) AddPages(...core.Page) {}

func (m *capturedMaroto) GetStructure() *node.Node[core.Structure] { return nil }

func (m *capturedMaroto) Generate() (core.Document, error) {
	return &capturedDocument{}, nil
}

type capturedDocument struct{}

func (d *capturedDocument) GetBytes() []byte { return nil }

func (d *capturedDocument) GetBase64() string { return "" }

func (d *capturedDocument) Save(string) error { return nil }

func (d *capturedDocument) GetReport() *metrics.Report { return nil }

func (d *capturedDocument) Merge([]byte) error { return nil }

func TestPDFReportRenderer_AddRiskRegisterUsesEffectiveFields(t *testing.T) {
	risk := approvedPDFRisk("R-100", "Latency Spike", 5, 4, 23)
	renderer := &pdfReportRenderer{}
	m := &capturedMaroto{}

	renderer.addRiskRegister(m, []*entity.Risk{risk})

	riskRow := findRowTextsContaining(t, m.rows, "R-100")
	want := []string{"1", "R-100", "Latency Spike", risk.Category, "5", "4", "23", entity.RiskLevelSangatTinggi, entity.RiskStatusApproved}
	assertExactTexts(t, riskRow, want)
}

func TestPDFReportRenderer_AddTopRisksUsesEffectiveScoreAndLevelColor(t *testing.T) {
	risk := approvedPDFRisk("R-200", "Cold Chain Failure", 5, 4, 23)
	renderer := &pdfReportRenderer{}
	m := &capturedMaroto{}

	renderer.addTopRisks(m, []*entity.Risk{risk})

	rowNode := findRowStructureContaining(t, m.rows, "P×D=23", "1. [R-200] Cold Chain Failure")
	badgeCol := rowNode.GetNexts()[0].GetData()
	if got := badgeCol.Details["prop_background_color"]; got != GetRiskLevelColor(entity.RiskLevelSangatTinggi).ToString() {
		t.Fatalf("top risks badge color = %v, want %s from effective risk level", got, GetRiskLevelColor(entity.RiskLevelSangatTinggi).ToString())
	}
	if got := badgeCol.Details["prop_background_color"]; got == GetRiskLevelColor(entity.RiskLevelSangatRendah).ToString() {
		t.Fatalf("top risks badge color unexpectedly matched inherent low level: %v", got)
	}
}

func TestPDFReportRenderer_AddRiskRegisterKeepsFallbackAndDraftIsolationCompatible(t *testing.T) {
	legacyApproved := approvedPDFRiskWithPartialReviewedBundle("R-201", "Legacy Fallback", entity.RiskStatusApproved, 5, 4, 20)
	draftReviewed := approvedPDFRisk("R-202", "Draft Isolation", 4, 4, 16)
	draftReviewed.Status = entity.RiskStatusInReview
	finalizedZero := approvedPDFRisk("R-203", "Zero Final", 5, 5, 25)
	renderer := &pdfReportRenderer{}
	m := &capturedMaroto{}

	renderer.addRiskRegister(m, []*entity.Risk{legacyApproved, draftReviewed, finalizedZero})

	assertExactTexts(t, findRowTextsContaining(t, m.rows, "R-201"), []string{"1", "R-201", "Legacy Fallback", legacyApproved.Category, "5", "4", "20", entity.RiskLevelSangatTinggi, entity.RiskStatusApproved})
	assertExactTexts(t, findRowTextsContaining(t, m.rows, "R-202"), []string{"2", "R-202", "Draft Isolation", draftReviewed.Category, "4", "4", "16", entity.RiskLevelTinggi, entity.RiskStatusInReview})
	assertExactTexts(t, findRowTextsContaining(t, m.rows, "R-203"), []string{"3", "R-203", "Zero Final", finalizedZero.Category, "5", "5", "25", entity.RiskLevelSangatTinggi, entity.RiskStatusApproved})
}

func TestPDFReportRenderer_AddFormalSectionsUsesScoresAndStatuses(t *testing.T) {
	renderer := &pdfReportRenderer{}
	m := &capturedMaroto{}
	data := testKMKFormalReportData()

	renderer.addFormalFoundationStatus(m, data)
	renderer.addFormalTMPMRSection(m, data)
	renderer.addFormalAppendix(m, data)

	foundationRow := findRowTextsContaining(t, m.rows, "Piagam, konteks, dan sasaran")
	if !containsAll(foundationRow, "Ada", "1") {
		t.Fatalf("foundation row missing status text: %v", foundationRow)
	}

	tmpmrRow := findRowTextsContaining(t, m.rows, "Skor TMPMR")
	if !containsAll(tmpmrRow, "4.20", "Terkelola") {
		t.Fatalf("tmpmr row missing score/maturity: %v", tmpmrRow)
	}

	appendixRow := findRowTextsContaining(t, m.rows, "charter_context_objectives")
	if !containsAll(appendixRow, "Ada", "1") {
		t.Fatalf("appendix row missing availability details: %v", appendixRow)
	}
}

func TestPDFReportRenderer_RenderFormalProducesPDFBytes(t *testing.T) {
	renderer := &pdfReportRenderer{}
	data := testKMKFormalReportData()

	bytesOut, err := renderer.RenderFormal(nil, data)
	if err != nil {
		t.Fatalf("RenderFormal failed: %v", err)
	}
	if len(bytesOut) == 0 {
		t.Fatal("RenderFormal returned empty bytes")
	}
	if !bytes.HasPrefix(bytesOut, []byte("%PDF")) {
		t.Fatalf("RenderFormal returned non-PDF bytes: %q", bytesOut[:4])
	}
}

func TestPDFReportRenderer_RenderFormalMonitoringEvaluationWithMinimalData(t *testing.T) {
	renderer := &pdfReportRenderer{}
	orgID := uuid.New()
	reportID := uuid.New()
	data := &entity.KMKFormalReportData{
		Report: &entity.FormalReport{
			ID:             reportID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeMonitoringEvaluation,
			Status:         entity.FormalReportStatusGenerated,
		},
		GeneratedAt: time.Date(2026, 5, 3, 10, 0, 0, 0, time.UTC),
		Organization: &entity.Organization{
			ID:   orgID,
			Name: "Direktorat Tahunan",
		},
		Period: "2025",
		MonitoringEvaluationReport: &entity.MonitoringEvaluationReportData{
			Report:           nil,
			Organization:     nil,
			OrganizationName: "Direktorat Tahunan",
			Year:             "2025",
			SemesterLabel:    "SEMESTER I",
		},
	}

	bytesOut, err := renderer.RenderFormal(nil, data)
	if err != nil {
		t.Fatalf("RenderFormal minimal monitoring evaluation failed: %v", err)
	}
	if len(bytesOut) == 0 {
		t.Fatal("RenderFormal minimal monitoring evaluation returned empty bytes")
	}
	if !bytes.HasPrefix(bytesOut, []byte("%PDF")) {
		t.Fatalf("RenderFormal minimal monitoring evaluation returned non-PDF bytes: %q", bytesOut[:4])
	}
}

func TestPDFReportRenderer_RenderFormalMonitoringEvaluationUsesSections(t *testing.T) {
	renderer := &pdfReportRenderer{}
	data := testKMKFormalReportData()

	bytesOut, err := renderer.RenderFormal(nil, data)
	if err != nil {
		t.Fatalf("RenderFormal failed: %v", err)
	}

	for _, want := range []string{
		"LAPORAN HASIL PEMANTAUAN DAN EVALUASI",
		"PENERAPAN MANAJEMEN RISIKO",
		"Dasar Pelaksanaan Pemantauan dan Evaluasi",
		"Hasil Pemantauan dan Evaluasi",
		"Format pemantauan pelaksanaan mitigasi risiko",
	} {
		if !bytes.Contains(bytesOut, []byte(want)) {
			t.Fatalf("RenderFormal output missing %q", want)
		}
	}
}

func approvedPDFRisk(code string, title string, probability int, impact int, inherentScore int) *entity.Risk {
	return &entity.Risk{
		Code:          code,
		Title:         title,
		Category:      entity.RiskCategoryOperasional,
		Status:        entity.RiskStatusApproved,
		Probability:   probability,
		Impact:        impact,
		Nilai:         float64(inherentScore),
		InherentScore: inherentScore,
	}
}

func approvedPDFRiskWithPartialReviewedBundle(code string, title string, status string, probability int, impact int, inherentScore int) *entity.Risk {
	return &entity.Risk{
		Code:          code,
		Title:         title,
		Category:      entity.RiskCategoryOperasional,
		Status:        status,
		Probability:   probability,
		Impact:        impact,
		Nilai:         float64(inherentScore),
		InherentScore: inherentScore,
	}
}

func testKMKFormalReportData() *entity.KMKFormalReportData {
	return testKMKFormalReportDataForType("monitoring_evaluation_report")
}

func testKMKFormalReportDataForType(reportType string) *entity.KMKFormalReportData {
	orgID := uuid.New()
	reportID := uuid.New()
	generatedAt := time.Date(2026, 5, 2, 10, 30, 0, 0, time.UTC)
	tmpmrID := uuid.New()
	data := &entity.KMKFormalReportData{
		Report: &entity.FormalReport{
			ID:             reportID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeMonitoringEvaluation,
			Status:         entity.FormalReportStatusGenerated,
		},
		GeneratedAt: generatedAt,
		Organization: &entity.Organization{
			ID:   orgID,
			Name: "Direktorat Kesehatan Masyarakat",
		},
		Period: "2025",
		RiskSummary: entity.ReportSummary{
			Cycle:              "2025",
			TotalRisks:         18,
			HighExtremeCount:   7,
			OverdueMitigations: 3,
			AvgExposureScore:   11.75,
			CategoryBreakdown: map[string]int{
				entity.RiskCategoryOperasional: 12,
				entity.RiskCategoryKepatuhan:   6,
			},
		},
		TMPMR: &entity.TMPMRAssessment{
			ID:             tmpmrID,
			OrganizationID: orgID,
			Period:         "2025",
			Status:         entity.TMPMRStatusReviewed,
			Score:          4.20,
			MaturityLevel:  "Terkelola",
			Items: []entity.TMPMRItem{
				{
					ID:          uuid.New(),
					Dimension:   "governance",
					Question:    "Tata kelola manajemen risiko telah ditetapkan dan dijalankan.",
					Score:       4,
					EvidenceURL: "https://example.invalid/gov",
					Notes:       "Dokumen tersedia",
				},
			},
		},
		SectionStatus: []entity.KMKReportSectionStatus{
			{
				Key:       "charter_context_objectives",
				Label:     "Piagam, konteks, dan sasaran",
				Available: true,
				Count:     1,
				Note:      "Tersedia",
			},
			{
				Key:       "evidence_support",
				Label:     "Evidence pendukung",
				Available: true,
				Count:     8,
				Note:      "Cukup",
			},
			{
				Key:       "mitigation_monitoring",
				Label:     "Pemantauan mitigasi",
				Available: false,
				Count:     0,
				Note:      "Menunggu update",
			},
		},
	}
	data.MonitoringEvaluationReport = &entity.MonitoringEvaluationReportData{
		Report:                  data.Report,
		Organization:            data.Organization,
		Summary:                 data.RiskSummary,
		OrganizationName:        data.Organization.Name,
		Year:                    "2025",
		SemesterLabel:           "SEMESTER I",
		ReportNumber:            "123/ME/2025",
		ReportDate:              "3 Mei 2026",
		AssignmentLetterNumber:  "321/TGS/2026",
		AssignmentLetterDate:    "1 Mei 2026",
		MonitoringDateRange:     "1-3 Mei 2026",
		UnitCode:                "UPR-01",
		UnitLocation:            "Jakarta",
		UnitAddress:             "Jl. Contoh No. 1",
		UnitEselonI:             "Sekretariat",
		UnitLeaderName:          "Dr. Contoh",
		DocumentChecklist:       buildMonitoringChecklistFixture(),
		InfrastructureChecklist: buildMonitoringChecklistFixture(),
		ResultChecklist:         buildMonitoringChecklistFixture(),
		MitigationSummary:       buildMonitoringMitigationFixture(),
	}

	return data
}

func buildMonitoringChecklistFixture() []entity.MonitoringEvaluationChecklistRow {
	return []entity.MonitoringEvaluationChecklistRow{
		{No: "1", Item: "Dokumen A", Yes: true},
	}
}

func buildMonitoringMitigationFixture() []entity.MonitoringEvaluationMitigationSummaryRow {
	return []entity.MonitoringEvaluationMitigationSummaryRow{
		{
			No:                         "1",
			LevelKey:                   entity.RiskLevelTinggi,
			LevelLabel:                 "Risiko Tinggi",
			RiskCount:                  2,
			MitigationPlanCount:        1,
			MitigationRealizationCount: 1,
			DownCount:                  0,
			SameCount:                  1,
			UpCount:                    0,
			NewCount:                   1,
		},
	}
}

func findRowTextsContaining(t *testing.T, rows []core.Row, needles ...string) []string {
	t.Helper()
	for _, row := range rows {
		texts := extractTexts(row.GetStructure())
		if containsAll(texts, needles...) {
			return texts
		}
	}
	t.Fatalf("no row contained texts %v", needles)
	return nil
}

func findRowStructureContaining(t *testing.T, rows []core.Row, needles ...string) *node.Node[core.Structure] {
	t.Helper()
	for _, row := range rows {
		structure := row.GetStructure()
		texts := extractTexts(structure)
		if containsAll(texts, needles...) {
			return structure
		}
	}
	t.Fatalf("no row structure contained texts %v", needles)
	return nil
}

func extractTexts(root *node.Node[core.Structure]) []string {
	var texts []string
	var walk func(*node.Node[core.Structure])
	walk = func(current *node.Node[core.Structure]) {
		if current == nil {
			return
		}
		data := current.GetData()
		if data.Type == "text" {
			if value, ok := data.Value.(string); ok {
				texts = append(texts, value)
			}
		}
		for _, child := range current.GetNexts() {
			walk(child)
		}
	}
	walk(root)
	return texts
}

func containsAll(texts []string, needles ...string) bool {
	index := 0
	for _, text := range texts {
		if text == needles[index] {
			index++
			if index == len(needles) {
				return true
			}
		}
	}
	return false
}

func assertExactTexts(t *testing.T, got []string, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("row text length = %d, want %d (%v)", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("row text[%d] = %q, want %q (full row: %v)", i, got[i], want[i], got)
		}
	}
}
