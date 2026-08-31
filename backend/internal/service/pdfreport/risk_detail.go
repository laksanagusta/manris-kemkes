package pdfreport

import (
	"bytes"
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/phpdave11/gofpdf"
)

const (
	riskDetailLineHeight         = 5.0
	riskDetailTitleFontSize      = 14.0
	riskDetailSectionFontSize    = 11.0
	riskDetailBodyFontSize       = 11.0
	riskDetailMitigationFontSize = 10.0
	riskDetailTableHeaderHeight  = 7.0
	riskDetailTableRowPad        = 1.4
	riskDetailBottomY            = 277.0
)

func (r *pdfReportRenderer) RenderRiskDetail(_ context.Context, data *entity.RiskDetailPDFData) ([]byte, error) {
	if data == nil {
		return nil, fmt.Errorf("risk detail data is required")
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetCompression(false)
	pdf.SetMargins(20, 20, 20)
	pdf.SetAutoPageBreak(true, 20)
	pdf.SetTitle(data.Title, false)
	pdf.SetSubject("Lampiran detail risiko", false)
	pdf.SetAuthor("MANRIS v2", false)
	pdf.SetFont("Arial", "", riskDetailBodyFontSize)
	pdf.AddPage()

	addRiskDetailCenteredTitle(pdf, "LAMPIRAN DETAIL RISIKO", riskDetailTitleFontSize, true)
	addRiskDetailCenteredTitle(pdf, safePDFText(data.Title), riskDetailSectionFontSize, false)
	if strings.TrimSpace(data.Code) != "" {
		addRiskDetailCenteredTitle(pdf, fmt.Sprintf("Kode Risiko: %s", data.Code), riskDetailBodyFontSize, false)
	}
	if strings.TrimSpace(data.OrganizationName) != "" {
		addRiskDetailCenteredTitle(pdf, data.OrganizationName, riskDetailBodyFontSize, false)
	}
	pdf.Ln(3)

	addRiskDetailSectionTitle(pdf, "Identitas Risiko")
	addRiskDetailKeyValueTable(pdf, []riskDetailField{
		{Label: "Status", Value: displayOrDash(data.Status)},
		{Label: "Unit Kerja", Value: displayOrDash(data.OrganizationName)},
		{Label: "Kategori Risiko", Value: displayOrDash(data.CategoryLabel)},
		{Label: "Sumber Risiko", Value: displayOrDash(data.RiskSource)},
		{Label: "Controllability", Value: displayOrDash(data.Controllability)},
		{Label: "Siklus Assessment", Value: displayOrDash(data.AssessmentCycle)},
	})

	addRiskDetailSectionTitle(pdf, "Identifikasi Risiko")
	addRiskDetailParagraphField(pdf, "Deskripsi Risiko", data.Description)
	addRiskDetailBulletField(pdf, "Sebab", data.Causes)
	addRiskDetailBulletField(pdf, "Dampak", data.Impacts)

	addRiskDetailSectionTitle(pdf, "Analisis Risiko")
	addRiskDetailKeyValueTable(pdf, []riskDetailField{
		{Label: "Probability", Value: intOrDash(data.Probability)},
		{Label: "Impact", Value: intOrDash(data.Impact)},
		{Label: "Bobot", Value: floatOrDash(data.Weight)},
		{Label: "Nilai", Value: floatOrDash(data.Nilai)},
		{Label: "Level Risiko", Value: displayOrDash(data.RiskLevelLabel)},
		{Label: "Prioritas Risiko", Value: intOrDash(data.RiskPriority)},
	})

	addRiskDetailSectionTitle(pdf, "Evaluasi Risiko")
	addRiskDetailKeyValueTable(pdf, []riskDetailField{
		{Label: "Selera Risiko", Value: displayOrDash(data.RiskAppetite)},
		{Label: "Risiko Utama", Value: displayOrDash(data.IsRiskUtamaLabel)},
		{Label: "Ringkasan Review", Value: displayOrDash(data.ReviewSummary)},
	})

	addRiskDetailSectionTitle(pdf, "Pengendalian dan Penanganan")
	addRiskDetailParagraphField(pdf, "Existing Control", data.ExistingControl)
	addRiskDetailParagraphField(pdf, "Efektivitas Pengendalian", data.ControlEffectiveness)
	addRiskDetailParagraphField(pdf, "Pilihan Penanganan", data.TreatmentOption)

	addRiskDetailSectionTitle(pdf, "Rencana Penanganan Risiko")
	if len(data.Mitigations) == 0 {
		addRiskDetailParagraph(pdf, "-")
	} else {
		addRiskDetailMitigationTable(pdf, data.Mitigations)
	}

	addRiskDetailSectionTitle(pdf, "Target Residual")
	addRiskDetailKeyValueTable(pdf, []riskDetailField{
		{Label: "Target Probability", Value: intOrDash(data.TargetProbability)},
		{Label: "Target Impact", Value: intOrDash(data.TargetImpact)},
		{Label: "Target Bobot", Value: floatOrDash(data.TargetWeight)},
		{Label: "Target Nilai", Value: floatOrDash(data.TargetNilai)},
	})

	addRiskDetailSectionTitle(pdf, "Metadata")
	addRiskDetailKeyValueTable(pdf, []riskDetailField{
		{Label: "Dibuat Oleh", Value: displayOrDash(data.CreatedByName)},
		{Label: "Dibuat Pada", Value: displayOrDash(formatRiskDetailTime(data.CreatedAt))},
		{Label: "Terakhir Diperbarui", Value: displayOrDash(formatRiskDetailTime(data.UpdatedAt))},
	})

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

type riskDetailField struct {
	Label string
	Value string
}

func addRiskDetailCenteredTitle(pdf *gofpdf.Fpdf, text string, size float64, bold bool) {
	style := ""
	if bold {
		style = "B"
	}
	pdf.SetFont("Arial", style, size)
	pdf.MultiCell(0, 7, safePDFText(text), "", "C", false)
}

func addRiskDetailSectionTitle(pdf *gofpdf.Fpdf, title string) {
	pdf.Ln(2)
	pdf.SetFont("Arial", "B", riskDetailSectionFontSize)
	startX := pdf.GetX()
	pdf.CellFormat(0, 6, title, "", 1, "L", false, 0, "")
	pdf.SetDrawColor(200, 210, 220)
	pdf.Line(startX, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(2)
	pdf.SetFont("Arial", "", riskDetailBodyFontSize)
}

func addRiskDetailParagraph(pdf *gofpdf.Fpdf, value string) {
	pdf.SetFont("Arial", "", riskDetailBodyFontSize)
	pdf.MultiCell(0, riskDetailLineHeight, displayOrDash(value), "", "J", false)
	pdf.Ln(1)
}

func addRiskDetailParagraphField(pdf *gofpdf.Fpdf, label, value string) {
	pdf.SetFont("Arial", "B", riskDetailBodyFontSize)
	pdf.MultiCell(0, riskDetailLineHeight, label, "", "L", false)
	pdf.SetFont("Arial", "", riskDetailBodyFontSize)
	pdf.MultiCell(0, riskDetailLineHeight, displayOrDash(value), "", "J", false)
	pdf.Ln(1)
}

func addRiskDetailBulletField(pdf *gofpdf.Fpdf, label string, items []string) {
	pdf.SetFont("Arial", "B", riskDetailBodyFontSize)
	pdf.MultiCell(0, riskDetailLineHeight, label, "", "L", false)
	pdf.SetFont("Arial", "", riskDetailBodyFontSize)
	if len(items) == 0 {
		pdf.MultiCell(0, riskDetailLineHeight, "-", "", "J", false)
		pdf.Ln(1)
		return
	}
	for _, item := range items {
		pdf.MultiCell(0, riskDetailLineHeight, "- "+safePDFText(item), "", "J", false)
	}
	pdf.Ln(1)
}

func addRiskDetailKeyValueTable(pdf *gofpdf.Fpdf, fields []riskDetailField) {
	labelWidth := 48.0
	valueWidth := 170.0 - labelWidth

	for _, field := range fields {
		drawRiskDetailTableRow(pdf, field.Label, field.Value, labelWidth, valueWidth)
	}
	pdf.Ln(1)
}

func addRiskDetailMitigationTable(pdf *gofpdf.Fpdf, mitigations []entity.Mitigation) {
	headers := []string{"No", "Aksi", "PIC", "Jadwal", "Deadline", "Catatan"}
	widths := []float64{10, 50, 28, 30, 22, 30}

	pdf.SetFont("Arial", "", riskDetailMitigationFontSize)
	drawRiskDetailTableHeader(pdf, headers, widths)
	for idx, mitigation := range mitigations {
		row := []string{
			fmt.Sprintf("%d", idx+1),
			safePDFText(mitigation.Action),
			safePDFText(mitigation.Owner),
			riskDetailFirstNonEmpty(strings.TrimSpace(mitigation.ExecutionScheduleText), strings.TrimSpace(mitigation.Frequency), strings.TrimSpace(mitigation.MitigationType)),
			riskDetailFirstNonEmpty(formatRiskDetailStringDate(mitigation.DueDate), "-"),
			riskDetailFirstNonEmpty(strings.TrimSpace(mitigation.PotentialObstacle), "-"),
		}
		height := riskDetailTableRowHeight(pdf, row, widths, false)
		if pdf.GetY()+height > riskDetailBottomY {
			pdf.AddPage()
			pdf.SetFont("Arial", "", riskDetailMitigationFontSize)
			drawRiskDetailTableHeader(pdf, headers, widths)
		}
		drawRiskDetailTableRowCells(pdf, row, widths, []int{1, 2, 3, 4, 5}, false)
	}
	pdf.Ln(1)
}

func drawRiskDetailTableHeader(pdf *gofpdf.Fpdf, headers []string, widths []float64) {
	pdf.SetFont("Arial", "B", 10)
	startX := pdf.GetX()
	startY := pdf.GetY()
	height := riskDetailTableHeaderHeight
	for i, header := range headers {
		x := startX + sumWidths(widths[:i])
		w := widths[i]
		pdf.SetFillColor(243, 244, 246)
		pdf.Rect(x, startY, w, height, "DF")
		pdf.SetXY(x, startY)
		pdf.CellFormat(w, height, safePDFText(header), "", 0, "C", true, 0, "")
	}
	pdf.SetXY(startX, startY+height)
}

func drawRiskDetailTableRow(pdf *gofpdf.Fpdf, label, value string, labelWidth, valueWidth float64) {
	rowHeight := riskDetailTableRowHeight(pdf, []string{label, value}, []float64{labelWidth, valueWidth}, true)
	drawRiskDetailTableRowCells(pdf, []string{label, value}, []float64{labelWidth, valueWidth}, nil, true, rowHeight)
}

func riskDetailTableRowHeight(pdf *gofpdf.Fpdf, cells []string, widths []float64, withLabelFill bool) float64 {
	height := 0.0
	for i, cell := range cells {
		cellHeight := riskDetailCellHeight(pdf, cell, widths[i], riskDetailLineHeight)
		if withLabelFill && len(cells) == 2 && i == 0 {
			cellHeight = math.Max(cellHeight, riskDetailCellHeight(pdf, cell, widths[i], riskDetailLineHeight))
		}
		if cellHeight > height {
			height = cellHeight
		}
	}
	return height
}

func drawRiskDetailTableRowCells(pdf *gofpdf.Fpdf, cells []string, widths []float64, leftAligned []int, withLabelFill bool, forcedHeight ...float64) {
	if len(cells) != len(widths) {
		return
	}
	height := forcedHeightValue(forcedHeight...)
	if height == 0 {
		for i, cell := range cells {
			cellHeight := riskDetailCellHeight(pdf, cell, widths[i], riskDetailLineHeight)
			if cellHeight > height {
				height = cellHeight
			}
		}
	}
	if pdf.GetY()+height > riskDetailBottomY {
		pdf.AddPage()
	}

	startX := pdf.GetX()
	startY := pdf.GetY()
	for i, cell := range cells {
		x := startX + sumWidths(widths[:i])
		w := widths[i]
		alignMode := "C"
		if withLabelFill && len(cells) == 2 {
			if i == 0 {
				alignMode = "L"
			} else {
				alignMode = "J"
			}
		} else if leftAligned != nil {
			for _, idx := range leftAligned {
				if idx == i {
					alignMode = "L"
					break
				}
			}
		}

		if withLabelFill && i == 0 {
			pdf.SetFillColor(243, 244, 246)
			pdf.Rect(x, startY, w, height, "DF")
		} else {
			pdf.Rect(x, startY, w, height, "D")
		}

		pdf.SetXY(x+1, startY+1.2)
		pdf.SetFont("Arial", "", riskDetailBodyFontSize)
		if i == 0 && len(cells) == 2 {
			pdf.SetFont("Arial", "B", riskDetailBodyFontSize)
		}
		pdf.MultiCell(w-2, riskDetailLineHeight, displayOrDash(cell), "", alignMode, false)
	}
	pdf.SetXY(startX, startY+height)
}

func riskDetailCellHeight(pdf *gofpdf.Fpdf, text string, width, lineHeight float64) float64 {
	lines := pdf.SplitText(displayOrDash(text), width-2)
	if len(lines) == 0 {
		lines = []string{""}
	}
	return float64(len(lines))*lineHeight + riskDetailTableRowPad
}

func sumWidths(widths []float64) float64 {
	total := 0.0
	for _, w := range widths {
		total += w
	}
	return total
}

func forcedHeightValue(values ...float64) float64 {
	if len(values) == 0 {
		return 0
	}
	return values[0]
}

func displayOrDash(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	return safePDFText(value)
}

func intOrDash(value int) string {
	if value == 0 {
		return "-"
	}
	return fmt.Sprintf("%d", value)
}

func floatOrDash(value float64) string {
	if value == 0 {
		return "-"
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.2f", value), "0"), ".")
}

func riskDetailFirstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" && value != "-" {
			return safePDFText(value)
		}
	}
	return "-"
}

func formatRiskDetailTime(value time.Time) string {
	if value.IsZero() {
		return "-"
	}
	return value.In(time.Local).Format("02 January 2006 15:04")
}

func formatRiskDetailStringDate(value *string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return "-"
	}
	return strings.TrimSpace(*value)
}

func safePDFText(value string) string {
	replacer := strings.NewReplacer(
		"\r\n", "\n",
		"\r", "\n",
		"\t", " ",
	)
	value = replacer.Replace(value)
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return value
}
