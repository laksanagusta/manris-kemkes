package agentreport

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/manris/backend/internal/agent"
	"github.com/xuri/excelize/v2"
)

func TestResponseExportsKeepDetailsPeriodsUnknownAndZero(t *testing.T) {
	zero := 0
	previous := 9
	message := snapshotFixture()
	message.Widgets = []agent.Widget{
		{Type: "risk_detail", Title: "Profil", Risk: &agent.RiskDetail{Code: "R-241", Title: "Risiko tersimpan", Score: &zero, Causes: []string{"Penyebab tersimpan"}, Mitigations: []agent.RiskMitigation{{Action: "=Usulan literal", Owner: "PIC tersimpan", DueDate: "2026-10-01"}}}},
		{Type: "period_comparison", Title: "Perbandingan", Comparison: &agent.PeriodComparison{Cycle: "2026-Q4", ComparisonCycle: "2026-Q3", Rows: []agent.ComparisonRow{{Label: "Tinggi", Current: nil, Previous: &previous}, {Label: "Terlambat", Current: &zero, Previous: &zero, Delta: &zero}}, Warnings: []string{"Data belum lengkap"}}},
		{Type: "priority_list", Title: "Prioritas", Priorities: &agent.PriorityList{Cycle: "2026-Q4", Total: 7, Page: 1, Limit: 5, Items: []agent.PriorityRisk{{Risk: agent.RiskDetail{Code: "R-241", Score: &zero}, OverdueCount: 1, Tasks: []agent.PriorityTask{{Action: "Tugas tersimpan", Owner: "PIC tersimpan", DueDate: "2026-10-01", Href: "/risk/monitoring"}}}}}},
	}
	result, err := Render(context.Background(), "Uji snapshot", message, "xlsx")
	if err != nil {
		t.Fatal(err)
	}
	file, err := excelize.OpenReader(bytes.NewReader(result.Bytes))
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	if value, _ := file.GetCellValue("Hasil 1", "G7"); value != "Penyebab tersimpan" {
		t.Fatalf("detail lost: %q", value)
	}
	if value, _ := file.GetCellValue("Hasil 1", "J7"); !strings.Contains(value, "PIC tersimpan") {
		t.Fatal("mitigation detail lost")
	}
	if value, _ := file.GetCellValue("Hasil 2", "B6"); value != "2026-Q3" {
		t.Fatal("comparison period lost")
	}
	if value, _ := file.GetCellValue("Hasil 2", "C7"); value != "" {
		t.Fatal("unknown value changed to zero")
	}
	if value, _ := file.GetCellValue("Hasil 2", "C8"); value != "0" {
		t.Fatal("legitimate zero lost")
	}
	if value, _ := file.GetCellValue("Hasil 3", "I7"); !strings.Contains(value, "Tugas tersimpan") {
		t.Fatal("priority tasks lost")
	}
	if value, _ := file.GetCellValue("Hasil 3", "A2"); !strings.Contains(value, "7 risiko") {
		t.Fatal("pagination limit undisclosed")
	}
	pdf, err := Render(context.Background(), "Uji snapshot", message, "pdf")
	if err != nil || !bytes.HasPrefix(pdf.Bytes, []byte("%PDF")) {
		t.Fatalf("invalid PDF: %v", err)
	}
	if message.Widgets[0].Columns != nil {
		t.Fatal("export mutated original snapshot")
	}
}

func TestLongRiskDetailsRemainCompleteInWorkbook(t *testing.T) {
	message := snapshotFixture()
	control := strings.Repeat("Pengendalian tersimpan. ", 2500)
	message.Widgets = []agent.Widget{{Type: "risk_detail", Title: "Detail panjang", Risk: &agent.RiskDetail{Code: "R-241", Control: control}}}
	result, err := Render(context.Background(), "Uji", message, "xlsx")
	if err != nil {
		t.Fatal(err)
	}
	file, err := excelize.OpenReader(bytes.NewReader(result.Bytes))
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	joined := ""
	for _, cell := range []string{"I7", "I8"} {
		part, _ := file.GetCellValue("Hasil 1", cell)
		joined += part
	}
	if joined != control {
		t.Fatal("risk detail was silently truncated")
	}
}
