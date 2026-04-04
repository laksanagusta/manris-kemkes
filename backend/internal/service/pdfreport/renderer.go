package pdfreport

import (
	"context"
	"fmt"
	"strconv"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/orientation"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
)

type pdfReportRenderer struct{}

func NewPDFReportRenderer() service.ReportPDFRenderer {
	return &pdfReportRenderer{}
}

func (r *pdfReportRenderer) Render(ctx context.Context, data *entity.ReportData) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithOrientation(orientation.Horizontal).
		WithLeftMargin(Margin).
		WithRightMargin(Margin).
		WithTopMargin(Margin).
		WithBottomMargin(Margin).
		WithDefaultFont(&props.Font{
			Family: fontfamily.Helvetica,
			Size:   FontSizeBody,
			Style:  fontstyle.Normal,
			Color:  BlackColor,
		}).Build()

	m := maroto.New(cfg)

	r.addExecutiveSummary(m, data)
	r.addHeatmapSection(m, data.Heatmap)
	r.addRiskRegister(m, data.Risks)
	r.addTopRisks(m, data.TopRisks)
	r.addIncidentSummary(m, data.Incidents)
	r.addKRISection(m, data.KRIs)
	r.addTrendSection(m, data.TrendData)

	doc, err := m.Generate()
	if err != nil {
		return nil, err
	}
	return doc.GetBytes(), nil
}

func (r *pdfReportRenderer) addExecutiveSummary(m core.Maroto, data *entity.ReportData) {
	summary := &data.Summary
	titleRow := row.New(FontSizeH1 + 4)
	titleRow.Add(col.New(gridSize).Add(text.New(
		"Laporan Risiko / Risk Report — "+summary.Cycle,
		props.Text{
			Size:   FontSizeH1,
			Align:  align.Center,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(titleRow)

	dateRow := row.New(FontSizeBody + 2)
	dateRow.Add(col.New(gridSize).Add(text.New(
		"Dihasilkan pada / Generated on: "+summary.GeneratedAt.Format("02 Jan 2006, 15:04"),
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Center,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(dateRow)
	m.AddRows(row.New(4))

	r.addKPIGrid(m, summary, data)
	m.AddRows(row.New(6))
}

func (r *pdfReportRenderer) addKPIGrid(m core.Maroto, summary *entity.ReportSummary, data *entity.ReportData) {
	kpis := []struct {
		label string
		value string
	}{
		{"Total Risiko / Total Risks", strconv.Itoa(summary.TotalRisks)},
		{"Risiko Tinggi & Ekstrem / High & Extreme Risks", strconv.Itoa(summary.HighExtremeCount)},
		{"Mitigasi Terlambat / Overdue Mitigations", strconv.Itoa(summary.OverdueMitigations)},
		{"Jumlah Insiden Terkait / Related Incidents", strconv.Itoa(len(data.Incidents))},
		{"Jumlah KRI / KRI Count", strconv.Itoa(len(data.KRIs))},
		{"Skor Eksposur Rata-rata / Avg Exposure Score", fmt.Sprintf("%.1f", summary.AvgExposureScore)},
	}

	for i := 0; i < len(kpis); i += 2 {
		kpiRow := row.New(RowHeight + 4)
		kpiRow.Add(col.New(gridSize))

		for j := 0; j < 2 && i+j < len(kpis); j++ {
			idx := i + j
			kpi := kpis[idx]
			innerCol := col.New(4)
			innerCol.Add(text.New(
				kpi.label,
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Center,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Bold,
				},
			))
			innerCol.Add(text.New(
				kpi.value,
				props.Text{
					Size:   FontSizeH2,
					Align:  align.Center,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Bold,
				},
			))
			kpiRow.Add(innerCol)
		}

		remaining := 4 - ((i % 4) + 2)
		if remaining > 0 && remaining < 4 {
			kpiRow.Add(col.New(remaining))
		}
		kpiRow.Add(col.New(gridSize))
		m.AddRows(kpiRow)
	}

	if len(summary.CategoryBreakdown) > 0 {
		catRow := row.New(RowHeight + 2)
		catRow.Add(col.New(gridSize))
		catCol := col.New(gridSize - 2)
		catCol.Add(text.New(
			"Kategori / Category: ",
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Left,
				Color:  BlackColor,
				Family: fontfamily.Helvetica,
				Style:  fontstyle.Bold,
			},
		))
		for cat, count := range summary.CategoryBreakdown {
			catCol.Add(text.New(
				fmt.Sprintf("%s(%d) ", cat, count),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
		}
		catRow.Add(catCol)
		catRow.Add(col.New(gridSize))
		m.AddRows(catRow)
	}
}

func (r *pdfReportRenderer) addHeatmapSection(m core.Maroto, heatmap [5][5]int) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Peta Risiko / Risk Heatmap",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(headerRow)
	m.AddRows(RenderHeatmapGrid(heatmap)...)
	m.AddRows(row.New(4))
}

func (r *pdfReportRenderer) addRiskRegister(m core.Maroto, risks []*entity.Risk) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Daftar Risiko / Risk Register",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(headerRow)

	header := []string{"No.", "Kode/Code", "Judul/Title", "Kategori/Category", "P", "D", "Skor/Score", "Level", "Status"}
	colWidths := []uint{2, 4, 8, 5, 2, 2, 3, 3, 3}

	var tableRows [][]string
	for i, risk := range risks {
		level := risk.GetRiskLevel()
		tableRows = append(tableRows, []string{
			strconv.Itoa(i + 1),
			risk.Code,
			truncate(risk.Title, 40),
			truncate(risk.Category, 15),
			strconv.Itoa(risk.Probability),
			strconv.Itoa(risk.Impact),
			strconv.Itoa(risk.GetInherentScore()),
			level,
			risk.Status,
		})
	}

	m.AddRows(RenderTable(header, tableRows, colWidths, WithFontSize(FontSizeSmall))...)
	m.AddRows(row.New(6))
}

func (r *pdfReportRenderer) addTopRisks(m core.Maroto, risks []*entity.Risk) {
	if len(risks) == 0 {
		return
	}

	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Top 10 Risiko Tertinggi / Top 10 Risks",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(headerRow)

	for i, risk := range risks {
		if i >= 10 {
			break
		}
		level := risk.GetRiskLevel()
		score := risk.GetInherentScore()

		scoreRow := row.New(RowHeight + 2)
		scoreRow.Add(col.New(1))
		badgeCol := col.New(2)
		badgeCol.Add(text.New(
			fmt.Sprintf("P×D = %d (%s)", score, level),
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Center,
				Color:  WhiteBg,
				Family: fontfamily.Helvetica,
				Style:  fontstyle.Bold,
			},
		))
		badgeCol.WithStyle(&props.Cell{BackgroundColor: GetRiskLevelColor(level)})
		titleCol := col.New(9)
		titleCol.Add(text.New(
			fmt.Sprintf("%d. [%s] %s", i+1, risk.Code, risk.Title),
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Left,
				Color:  BlackColor,
				Family: fontfamily.Helvetica,
				Style:  fontstyle.Bold,
			},
		))
		scoreRow.Add(badgeCol)
		scoreRow.Add(titleCol)
		scoreRow.Add(col.New(gridSize))
		m.AddRows(scoreRow)

		if len(risk.Cause) > 0 {
			causeRow := row.New(RowHeight)
			causeRow.Add(col.New(1))
			causeCol := col.New(gridSize - 2)
			causeCol.Add(text.New(
				"Penyebab / Causes: "+truncate(joinStrings(risk.Cause, ", "), 80),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
			causeRow.Add(causeCol)
			causeRow.Add(col.New(gridSize))
			m.AddRows(causeRow)
		}

		if risk.ExistingControl != "" {
			ctrlRow := row.New(RowHeight)
			ctrlRow.Add(col.New(1))
			ctrlCol := col.New(gridSize - 2)
			ctrlCol.Add(text.New(
				"Kontrol Eksisting / Existing Control: "+truncate(risk.ExistingControl, 80),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
			ctrlRow.Add(ctrlCol)
			ctrlRow.Add(col.New(gridSize))
			m.AddRows(ctrlRow)
		}

		if risk.TreatmentOption != "" {
			treatRow := row.New(RowHeight)
			treatRow.Add(col.New(1))
			treatCol := col.New(gridSize - 2)
			treatCol.Add(text.New(
				"Opsi Penanganan / Treatment: "+truncate(risk.TreatmentOption, 80),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
			treatRow.Add(treatCol)
			treatRow.Add(col.New(gridSize))
			m.AddRows(treatRow)
		}

		if len(risk.Mitigations) > 0 {
			for mi, mit := range risk.Mitigations {
				if mi >= 3 {
					break
				}
				mitRow := row.New(RowHeight)
				mitRow.Add(col.New(1))
				mitCol := col.New(gridSize - 2)
				dueDateStr := ""
				if mit.DueDate != nil {
					dueDateStr = " (due: " + *mit.DueDate + ")"
				}
				mitCol.Add(text.New(
					fmt.Sprintf("  %d. %s%s", mi+1, truncate(mit.Action, 70), dueDateStr),
					props.Text{
						Size:   FontSizeSmall,
						Align:  align.Left,
						Color:  BlackColor,
						Family: fontfamily.Helvetica,
					},
				))
				mitRow.Add(mitCol)
				mitRow.Add(col.New(gridSize))
				m.AddRows(mitRow)
			}
		}

		m.AddRows(row.New(2))
	}
	m.AddRows(row.New(6))
}

func (r *pdfReportRenderer) addIncidentSummary(m core.Maroto, incidents []*entity.Incident) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Ringkasan Insiden / Incident Summary",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(headerRow)

	if len(incidents) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Tidak ada insiden terkait / No related incidents",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  BlackColor,
				Family: fontfamily.Helvetica,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(6))
		return
	}

	header := []string{"No.", "Kode/Code", "Judul/Title", "Severity", "Status", "Tindakan Korektif/Corrective Action"}
	colWidths := []uint{2, 4, 6, 3, 3, 6}

	var tableRows [][]string
	for i, inc := range incidents {
		code := ""
		if inc.Code != nil {
			code = *inc.Code
		}
		tableRows = append(tableRows, []string{
			strconv.Itoa(i + 1),
			code,
			truncate(inc.Title, 30),
			inc.Severity,
			inc.Status,
			truncate(inc.CorrectiveAction, 30),
		})
	}

	m.AddRows(RenderTable(header, tableRows, colWidths, WithFontSize(FontSizeSmall))...)
	m.AddRows(row.New(6))
}

func (r *pdfReportRenderer) addKRISection(m core.Maroto, kris []*entity.KRI) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Status KRI / KRI Dashboard",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(headerRow)

	if len(kris) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Tidak ada KRI terkait / No related KRIs",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  BlackColor,
				Family: fontfamily.Helvetica,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(6))
		return
	}

	kriHeader := []string{"No.", "Nama KRI/KRI Name", "Threshold", "Nilai Aktual/Actual Value", "Status", "Risiko Terkait/Linked Risk"}
	kriWidths := []uint{2, 6, 4, 4, 3, 5}

	var kriRows [][]string
	for i, kri := range kris {
		status := kri.GetStatus()
		threshold := fmt.Sprintf("%.0f - %.0f", kri.ThresholdMin, kri.ThresholdMax)
		kriRows = append(kriRows, []string{
			strconv.Itoa(i + 1),
			truncate(kri.Name, 30),
			threshold,
			fmt.Sprintf("%.2f", kri.CurrentValue),
			status,
			truncate(kri.RiskTitle, 25),
		})
	}

	m.AddRows(RenderTable(kriHeader, kriRows, kriWidths, WithFontSize(FontSizeSmall))...)
	m.AddRows(row.New(6))
}

func (r *pdfReportRenderer) addTrendSection(m core.Maroto, trendData []entity.CycleTrendPoint) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Tren Risiko / Risk Trend",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(headerRow)

	trendRow, err := RenderTrendChartRow(trendData)
	if err == nil && trendRow != nil {
		m.AddRows(trendRow)
	}
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}

var _ service.ReportPDFRenderer = &pdfReportRenderer{}
