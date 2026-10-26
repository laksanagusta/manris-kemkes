// Package agentreport exports a saved conversation result without refetching or
// recalculating business data. Authorization belongs to the application boundary.
package agentreport

import (
	"bytes"
	"context"
	"fmt"
	"strconv"
	"strings"
	"unicode"

	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/timeutil"
	"github.com/phpdave11/gofpdf"
	"github.com/xuri/excelize/v2"
)

type Result struct {
	Bytes       []byte
	ContentType string
	Extension   string
}

func Render(ctx context.Context, title string, message agent.Message, format string) (Result, error) {
	if message.Role != "assistant" || len(message.Widgets) == 0 {
		return Result{}, agent.ErrInvalidInput
	}
	if err := ctx.Err(); err != nil {
		return Result{}, err
	}
	switch format {
	case "xlsx":
		data, err := workbook(ctx, title, message)
		return Result{Bytes: data, ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Extension: "xlsx"}, err
	case "pdf":
		data, err := document(ctx, title, message)
		return Result{Bytes: data, ContentType: "application/pdf", Extension: "pdf"}, err
	default:
		return Result{}, agent.ErrInvalidInput
	}
}

func scalar(value any) string {
	if value == nil {
		return "—"
	}
	switch v := value.(type) {
	case bool:
		if v {
			return "Ya"
		}
		return "Tidak"
	case string:
		return v
	default:
		return fmt.Sprint(v)
	}
}

func timestamp(message agent.Message) string {
	return message.CreatedAt.In(timeutil.JakartaLocation()).Format("02 Jan 2006 15:04:05 MST")
}

func workbook(ctx context.Context, title string, message agent.Message) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()
	if err := f.SetSheetName("Sheet1", "Ringkasan"); err != nil {
		return nil, err
	}
	set := func(sheet string, row, column int, value any) error {
		cell, err := excelize.CoordinatesToCellName(column, row)
		if err != nil {
			return err
		}
		if text, ok := value.(string); ok {
			// Explicit string cells keep formula-like source text inert.
			return f.SetCellStr(sheet, cell, text)
		}
		return f.SetCellValue(sheet, cell, value)
	}
	metadata := [][]string{{"Manris Agent", title}, {"Snapshot jawaban", timestamp(message)}, {"Catatan", "Isi mengikuti hasil tersimpan. Perubahan data setelah snapshot tidak dimasukkan."}}
	for i, row := range metadata {
		for j, value := range row {
			if err := set("Ringkasan", i+1, j+1, value); err != nil {
				return nil, err
			}
		}
	}
	for i, chunk := range chunks(message.Content, 30000) {
		if err := set("Ringkasan", i+5, 1, "Uraian "+strconv.Itoa(i+1)); err != nil {
			return nil, err
		}
		if err := set("Ringkasan", i+5, 2, chunk); err != nil {
			return nil, err
		}
	}
	style, err := f.NewStyle(&excelize.Style{Font: &excelize.Font{Family: "Arial", Size: 11}, Alignment: &excelize.Alignment{Vertical: "top", WrapText: true}})
	if err != nil {
		return nil, err
	}
	header, err := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "202020"}, Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F6F6F6"}}, Alignment: &excelize.Alignment{WrapText: true, Vertical: "top"}})
	if err != nil {
		return nil, err
	}
	if err := f.SetColWidth("Ringkasan", "A", "A", 24); err != nil {
		return nil, err
	}
	if err := f.SetColWidth("Ringkasan", "B", "B", 100); err != nil {
		return nil, err
	}
	if err := f.SetCellStyle("Ringkasan", "A1", fmt.Sprintf("B%d", 6+len(chunks(message.Content, 30000))), style); err != nil {
		return nil, err
	}
	for index, widget := range message.Widgets {
		widget = exportWidget(widget)
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		sheet := fmt.Sprintf("Hasil %d", index+1)
		if _, err := f.NewSheet(sheet); err != nil {
			return nil, err
		}
		rows := [][]any{{widget.Title}, {widget.Description}, {"Cakupan", widget.ScopeLabel}, {"Waktu snapshot", widget.SnapshotAt.In(timeutil.JakartaLocation()).Format("02 Jan 2006 15:04:05 MST")}, {}}
		if widget.Type == "metrics" {
			rows = append(rows, []any{"Metrik", "Nilai", "Keterangan"})
			for _, metric := range widget.Metrics {
				rows = append(rows, []any{metric.Label, metric.Value, metric.Description})
			}
		} else if len(widget.Columns) > 0 {
			labels := []any{}
			for _, column := range widget.Columns {
				labels = append(labels, column.Label)
			}
			rows = append(rows, labels)
			for _, row := range widget.Rows {
				values := []any{}
				for _, column := range widget.Columns {
					values = append(values, row[column.Key])
				}
				rows = append(rows, expandedExportRow(values)...)
			}
		} else {
			rows = append(rows, []any{"Keterangan", widget.Description})
		}
		if len(widget.SourceIDs) > 0 {
			rows = append(rows, []any{}, []any{"Sumber aplikasi"})
			for _, source := range widget.SourceIDs {
				rows = append(rows, []any{source})
			}
		}
		width := 3
		for i, row := range rows {
			if len(row) > width {
				width = len(row)
			}
			for j, value := range row {
				if err := set(sheet, i+1, j+1, value); err != nil {
					return nil, err
				}
			}
		}
		last, err := excelize.ColumnNumberToName(width)
		if err != nil {
			return nil, err
		}
		if err := f.SetColWidth(sheet, "A", last, 32); err != nil {
			return nil, err
		}
		if err := f.SetCellStyle(sheet, "A1", fmt.Sprintf("%s%d", last, len(rows)), style); err != nil {
			return nil, err
		}
		if err := f.SetCellStyle(sheet, "A6", last+"6", header); err != nil {
			return nil, err
		}
	}
	f.SetActiveSheet(0)
	data, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return data.Bytes(), nil
}

func chunks(value string, maximum int) []string {
	runes := []rune(value)
	out := []string{}
	for len(runes) > 0 {
		count := min(len(runes), maximum)
		out = append(out, string(runes[:count]))
		runes = runes[count:]
	}
	return out
}

func document(ctx context.Context, title string, message agent.Message) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(18, 18, 18)
	pdf.SetAutoPageBreak(true, 18)
	pdf.SetTitle("Manris Agent - "+title, true)
	pdf.SetAuthor("Manris", true)
	pdf.AliasNbPages("")
	translate := pdf.UnicodeTranslatorFromDescriptor("cp1252")
	text := func(value string) string {
		value = strings.Map(func(r rune) rune {
			if unicode.IsControl(r) && r != '\n' && r != '\t' {
				return -1
			}
			return r
		}, value)
		return translate(value)
	}
	pdf.SetFooterFunc(func() {
		pdf.SetY(-12)
		pdf.SetFont("Arial", "", 8)
		pdf.SetTextColor(99, 99, 99)
		pdf.CellFormat(0, 4, fmt.Sprintf("Manris Agent | %d/{nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})
	pdf.AddPage()
	heading := func(value string, size float64) {
		pdf.SetFont("Arial", "B", size)
		pdf.SetTextColor(32, 32, 32)
		pdf.MultiCell(0, 6, text(value), "", "L", false)
		pdf.Ln(2)
	}
	paragraph := func(value string) {
		pdf.SetFont("Arial", "", 10)
		pdf.SetTextColor(32, 32, 32)
		pdf.MultiCell(0, 5, text(value), "", "L", false)
	}
	heading("Snapshot percakapan Agent", 18)
	heading(title, 12)
	paragraph("Jawaban tersimpan: " + timestamp(message))
	paragraph("Angka dan rincian mengikuti snapshot pada percakapan.")
	pdf.Ln(4)
	paragraph(message.Content)
	for _, widget := range message.Widgets {
		widget = exportWidget(widget)
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		pdf.Ln(6)
		heading(widget.Title, 12)
		paragraph(widget.ScopeLabel + " | " + widget.SnapshotAt.In(timeutil.JakartaLocation()).Format("02 Jan 2006 15:04:05 MST"))
		if widget.Description != "" {
			paragraph(widget.Description)
		}
		for _, metric := range widget.Metrics {
			paragraph(metric.Label + ": " + scalar(metric.Value))
			if metric.Description != "" {
				paragraph(metric.Description)
			}
		}
		for index, row := range widget.Rows {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			pdf.Ln(3)
			if len(widget.Rows) > 1 {
				heading(strconv.Itoa(index+1), 10)
			}
			for _, column := range widget.Columns {
				paragraph(column.Label + ": " + scalar(row[column.Key]))
			}
		}
		if len(widget.SourceIDs) > 0 {
			pdf.Ln(2)
			heading("Sumber aplikasi", 10)
			for _, source := range widget.SourceIDs {
				paragraph(source)
			}
		}
	}
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}
