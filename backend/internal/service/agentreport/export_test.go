package agentreport

import (
	"bytes"
	"context"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/manris/backend/internal/agent"
	"github.com/xuri/excelize/v2"
)

func snapshotFixture() agent.Message {
	return agent.Message{Role: "assistant", Content: "Ringkasan tersimpan", CreatedAt: time.Date(2026, 10, 24, 1, 0, 0, 0, time.UTC), Widgets: []agent.Widget{
		{Type: "metrics", Title: "Metrik", SnapshotAt: time.Date(2026, 10, 24, 0, 0, 0, 0, time.UTC), ScopeLabel: "Unit uji", Metrics: []agent.Metric{{Label: "Terlambat", Value: 0, Description: "Nol adalah data, bukan kosong."}}},
		{Type: "table", Title: "Rincian", Columns: []agent.Column{{Key: "title", Label: "Risiko"}, {Key: "count", Label: "Jumlah"}}, Rows: []map[string]any{{"title": "=HYPERLINK(\"https://example.invalid\")", "count": 7}}, SourceIDs: []string{"/reports?cycle=2026-Q4&org_id=unit-uji"}},
	}}
}

func TestExcelKeepsSnapshotZeroAndInertSourceText(t *testing.T) {
	result, err := Render(context.Background(), "Tinjauan", snapshotFixture(), "xlsx")
	if err != nil {
		t.Fatal(err)
	}
	file, err := excelize.OpenReader(bytes.NewReader(result.Bytes))
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	if got, _ := file.GetCellValue("Hasil 1", "B7"); got != "0" {
		t.Fatalf("zero lost: %q", got)
	}
	if got, _ := file.GetCellValue("Hasil 2", "B7"); got != "7" {
		t.Fatalf("snapshot count changed: %q", got)
	}
	if formula, _ := file.GetCellFormula("Hasil 2", "A7"); formula != "" {
		t.Fatal("source text became a formula")
	}
	if got, _ := file.GetCellValue("Hasil 2", "A7"); !strings.HasPrefix(got, "=HYPERLINK") {
		t.Fatalf("source text changed: %q", got)
	}
	if got, _ := file.GetCellValue("Ringkasan", "B2"); !strings.Contains(got, "08:00:00") {
		t.Fatalf("timestamp is not Jakarta: %q", got)
	}
}

func TestSnapshotExportsOnlyResultsAndRespectsCancellation(t *testing.T) {
	message := snapshotFixture()
	result, err := Render(context.Background(), "Tinjauan", message, "pdf")
	if err != nil || !bytes.HasPrefix(result.Bytes, []byte("%PDF")) {
		t.Fatalf("invalid PDF: %v", err)
	}
	message.Role = "user"
	if _, err := Render(context.Background(), "", message, "xlsx"); err == nil {
		t.Fatal("exported user message as agent result")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := Render(ctx, "", snapshotFixture(), "pdf"); err == nil {
		t.Fatal("ignored cancellation")
	}
}

func TestLongNarrativeIsPreservedAcrossExcelCells(t *testing.T) {
	message := snapshotFixture()
	message.Content = strings.Repeat("bukti α ", 8000)
	result, err := Render(context.Background(), "Tinjauan", message, "xlsx")
	if err != nil {
		t.Fatal(err)
	}
	file, err := excelize.OpenReader(bytes.NewReader(result.Bytes))
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	got := ""
	for row := 5; row < 10; row++ {
		value, _ := file.GetCellValue("Ringkasan", "B"+strconv.Itoa(row))
		got += value
	}
	if got != message.Content {
		t.Fatal("long narrative was truncated or changed")
	}
}
