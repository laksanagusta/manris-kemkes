package pdfreport

import (
	"testing"

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
	risk := approvedPDFRisk("R-100", "Latency Spike", 1, 1, 1, 5, 4, 23)
	renderer := &pdfReportRenderer{}
	m := &capturedMaroto{}

	renderer.addRiskRegister(m, []*entity.Risk{risk})

	riskRow := findRowTextsContaining(t, m.rows, "R-100")
	want := []string{"1", "R-100", "Latency Spike", risk.Category, "5", "4", "23", entity.RiskLevelSangatTinggi, entity.RiskStatusApproved}
	assertExactTexts(t, riskRow, want)
}

func TestPDFReportRenderer_AddTopRisksUsesEffectiveScoreAndLevelColor(t *testing.T) {
	risk := approvedPDFRisk("R-200", "Cold Chain Failure", 1, 1, 1, 5, 4, 23)
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
	legacyApproved := approvedPDFRiskWithPartialReviewedBundle("R-201", "Legacy Fallback", entity.RiskStatusApproved, 5, 4, 20, 1, 1)
	draftReviewed := approvedPDFRisk("R-202", "Draft Isolation", 4, 4, 16, 1, 1, 0)
	draftReviewed.Status = entity.RiskStatusInApproval
	finalizedZero := approvedPDFRisk("R-203", "Zero Final", 5, 5, 25, 1, 1, 0)
	renderer := &pdfReportRenderer{}
	m := &capturedMaroto{}

	renderer.addRiskRegister(m, []*entity.Risk{legacyApproved, draftReviewed, finalizedZero})

	assertExactTexts(t, findRowTextsContaining(t, m.rows, "R-201"), []string{"1", "R-201", "Legacy Fallback", legacyApproved.Category, "5", "4", "20", entity.RiskLevelSangatTinggi, entity.RiskStatusApproved})
	assertExactTexts(t, findRowTextsContaining(t, m.rows, "R-202"), []string{"2", "R-202", "Draft Isolation", draftReviewed.Category, "4", "4", "16", entity.RiskLevelTinggi, entity.RiskStatusInApproval})
	assertExactTexts(t, findRowTextsContaining(t, m.rows, "R-203"), []string{"3", "R-203", "Zero Final", finalizedZero.Category, "1", "1", "0", entity.RiskLevelSangatRendah, entity.RiskStatusApproved})
}

func approvedPDFRisk(code string, title string, probability int, impact int, inherentScore int, reviewedProbability int, reviewedImpact int, reviewedScore int) *entity.Risk {
	reviewedWeight := 1.0
	reviewedNilai := float64(reviewedScore)

	return &entity.Risk{
		Code:                code,
		Title:               title,
		Category:            entity.RiskCategoryOperasional,
		Status:              entity.RiskStatusApproved,
		Probability:         probability,
		Impact:              impact,
		Nilai:               float64(inherentScore),
		InherentScore:       inherentScore,
		ReviewedProbability: &reviewedProbability,
		ReviewedImpact:      &reviewedImpact,
		ReviewedWeight:      &reviewedWeight,
		ReviewedNilai:       &reviewedNilai,
		ReviewedScore:       &reviewedScore,
	}
}

func approvedPDFRiskWithPartialReviewedBundle(code string, title string, status string, probability int, impact int, inherentScore int, reviewedProbability int, reviewedImpact int) *entity.Risk {
	reviewedWeight := 1.0
	reviewedNilai := float64(inherentScore)

	return &entity.Risk{
		Code:                code,
		Title:               title,
		Category:            entity.RiskCategoryOperasional,
		Status:              status,
		Probability:         probability,
		Impact:              impact,
		Nilai:               float64(inherentScore),
		InherentScore:       inherentScore,
		ReviewedProbability: &reviewedProbability,
		ReviewedImpact:      &reviewedImpact,
		ReviewedWeight:      &reviewedWeight,
		ReviewedNilai:       &reviewedNilai,
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
