package documenttext

import (
	"bytes"
	"strings"
	"testing"

	"github.com/xuri/excelize/v2"
)

func TestExtractXLSXIncludesSheetAndRows(t *testing.T) {
	f := excelize.NewFile()
	sheet := f.GetSheetName(0)
	if err := f.SetCellValue(sheet, "A1", "Risiko"); err != nil {
		t.Fatal(err)
	}
	if err := f.SetCellValue(sheet, "B1", "Mitigasi"); err != nil {
		t.Fatal(err)
	}
	if err := f.SetCellValue(sheet, "A2", "Keterlambatan laporan"); err != nil {
		t.Fatal(err)
	}
	if err := f.SetCellValue(sheet, "B2", "Checklist mingguan"); err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		t.Fatal(err)
	}

	result, err := Extract(ExtractInput{
		Filename: "monitoring.xlsx",
		Content:  buf.Bytes(),
		MaxChars: 60000,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(result.Text, "Sheet: Sheet1 | Row 2") {
		t.Fatalf("expected row marker, got %q", result.Text)
	}
	if !strings.Contains(result.Text, "Keterlambatan laporan") {
		t.Fatalf("expected cell text, got %q", result.Text)
	}
}

func TestExtractRejectsUnsupportedExtension(t *testing.T) {
	_, err := Extract(ExtractInput{
		Filename: "doc.txt",
		Content:  []byte("abc"),
		MaxChars: 60000,
	})
	if err == nil {
		t.Fatal("expected unsupported extension error")
	}
}

func TestTruncateTextAddsWarning(t *testing.T) {
	result := truncateText("abcdef", 3)
	if result.Text != "abc" {
		t.Fatalf("Text = %q, want abc", result.Text)
	}
	if len(result.Warnings) != 1 {
		t.Fatalf("expected one warning, got %v", result.Warnings)
	}
}
