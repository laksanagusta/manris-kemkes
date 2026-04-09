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

// maxTitleLen is the maximum character length for risk/incident titles before truncation.
const maxTitleLen = 60

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
		WithBottomMargin(Margin + 8).
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

	r.addPageNumbers(m)

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
			Color:  MutedText,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(dateRow)
	m.AddRows(row.New(6))

	r.addKPIGrid(m, summary, data)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addKPIGrid(m core.Maroto, summary *entity.ReportSummary, data *entity.ReportData) {
	kpis := []struct {
		label string
		value string
	}{
		{"Total Risiko", strconv.Itoa(summary.TotalRisks)},
		{"Tinggi & Ekstrem", strconv.Itoa(summary.HighExtremeCount)},
		{"Mitigasi Terlambat", strconv.Itoa(summary.OverdueMitigations)},
		{"Insiden Terkait", strconv.Itoa(len(data.Incidents))},
		{"Jumlah KRI", strconv.Itoa(len(data.KRIs))},
		{"Skor Eksposur Rata-rata", fmt.Sprintf("%.1f", summary.AvgExposureScore)},
	}

	for i := 0; i < len(kpis); i += 3 {
		kpiRow := row.New(RowHeight + 6)
		for j := 0; j < 3 && i+j < len(kpis); j++ {
			idx := i + j
			kpi := kpis[idx]
			innerCol := col.New(4)
			innerCol.Add(text.New(
				kpi.label,
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Center,
					Color:  MutedText,
					Family: fontfamily.Helvetica,
				},
			))
			innerCol.Add(text.New(
				kpi.value,
				props.Text{
					Size:   FontSizeH1,
					Align:  align.Center,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Bold,
				},
			))
			innerCol.WithStyle(CellBorder())
			kpiRow.Add(innerCol)
		}
		m.AddRows(kpiRow)
	}

	if len(summary.CategoryBreakdown) > 0 {
		catRow := row.New(RowHeight)
		catRow.Add(col.New(gridSize).Add(text.New(
			"Kategori: ",
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Left,
				Color:  MutedText,
				Family: fontfamily.Helvetica,
				Style:  fontstyle.Bold,
			},
		)))
		m.AddRows(catRow)

		catItemsRow := row.New(RowHeight)
		catItemsCol := col.New(gridSize)
		for cat, count := range summary.CategoryBreakdown {
			catItemsCol.Add(text.New(
				fmt.Sprintf("%s (%d)  ", cat, count),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
		}
		catItemsRow.Add(catItemsCol)
		m.AddRows(catItemsRow)
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
	m.AddRows(row.New(SectionSpacing))
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

	header := []string{"No.", "Kode", "Judul / Title", "Kategori", "P", "D", "Skor", "Level", "Status"}
	colWidths := []uint{2, 4, 10, 5, 2, 2, 3, 4, 4}

	var tableRows [][]string
	for i, risk := range risks {
		level := risk.GetRiskLevel()
		tableRows = append(tableRows, []string{
			strconv.Itoa(i + 1),
			risk.Code,
			truncate(risk.Title, maxTitleLen),
			truncate(risk.Category, 20),
			strconv.Itoa(risk.EffectiveProbability()),
			strconv.Itoa(risk.EffectiveImpact()),
			strconv.Itoa(risk.GetEffectiveScore()),
			level,
			risk.Status,
		})
	}

	m.AddRows(RenderTable(header, tableRows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(2, 3, 8))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addTopRisks(m core.Maroto, risks []*entity.Risk) {
	if len(risks) == 0 {
		return
	}

	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Top 10 Risiko Tertinggi / Top 10 Highest Risks",
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
		score := risk.GetEffectiveScore()

		titleRow := row.New(RowHeight + 4)
		badgeCol := col.New(2)
		badgeCol.Add(text.New(
			fmt.Sprintf("P×D=%d", score),
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Center,
				Color:  WhiteBg,
				Family: fontfamily.Helvetica,
				Style:  fontstyle.Bold,
			},
		))
		badgeCol.WithStyle(&props.Cell{BackgroundColor: GetRiskLevelColor(level)})
		titleTextCol := col.New(10)
		titleTextCol.Add(text.New(
			fmt.Sprintf("%d. [%s] %s", i+1, risk.Code, risk.Title),
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Left,
				Color:  BlackColor,
				Family: fontfamily.Helvetica,
				Style:  fontstyle.Bold,
			},
		))
		titleRow.Add(badgeCol)
		titleRow.Add(titleTextCol)
		m.AddRows(titleRow)

		if len(risk.Cause) > 0 {
			causeRow := row.New(RowHeight + 2)
			causeLabelCol := col.New(2)
			causeLabelCol.Add(text.New(
				"Penyebab:",
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  MutedText,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Bold,
				},
			))
			causeValueCol := col.New(10)
			causeValueCol.Add(text.New(
				joinStrings(risk.Cause, ", "),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
			causeRow.Add(causeLabelCol)
			causeRow.Add(causeValueCol)
			m.AddRows(causeRow)
		}

		if risk.ExistingControl != "" {
			ctrlRow := row.New(RowHeight + 2)
			ctrlLabelCol := col.New(2)
			ctrlLabelCol.Add(text.New(
				"Kontrol:",
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  MutedText,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Bold,
				},
			))
			ctrlValueCol := col.New(10)
			ctrlValueCol.Add(text.New(
				risk.ExistingControl,
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
			ctrlRow.Add(ctrlLabelCol)
			ctrlRow.Add(ctrlValueCol)
			m.AddRows(ctrlRow)
		}

		if risk.TreatmentOption != "" {
			treatRow := row.New(RowHeight + 2)
			treatLabelCol := col.New(2)
			treatLabelCol.Add(text.New(
				"Penanganan:",
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  MutedText,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Bold,
				},
			))
			treatValueCol := col.New(10)
			treatValueCol.Add(text.New(
				risk.TreatmentOption,
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
				},
			))
			treatRow.Add(treatLabelCol)
			treatRow.Add(treatValueCol)
			m.AddRows(treatRow)
		}

		if len(risk.Mitigations) > 0 {
			mitHeaderRow := row.New(RowHeight)
			mitHeaderRow.Add(col.New(2).Add(text.New(
				"Mitigasi:",
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  MutedText,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Bold,
				},
			)))
			m.AddRows(mitHeaderRow)

			for mi, mit := range risk.Mitigations {
				if mi >= 5 {
					break
				}
				dueDateStr := ""
				if mit.DueDate != nil {
					dueDateStr = " (tenggat: " + *mit.DueDate + ")"
				}
				mitRow := row.New(RowHeight + 2)
				mitRow.Add(col.New(2).Add(text.New(
					fmt.Sprintf("%d. %s%s", mi+1, mit.Action, dueDateStr),
					props.Text{
						Size:   FontSizeSmall,
						Align:  align.Left,
						Color:  BlackColor,
						Family: fontfamily.Helvetica,
					},
				)))
				m.AddRows(mitRow)
			}
		}

		m.AddRows(row.New(4))
	}
	m.AddRows(row.New(SectionSpacing))
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
				Color:  MutedText,
				Family: fontfamily.Helvetica,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	header := []string{"No.", "Kode", "Judul / Title", "Severity", "Status", "Tindakan Korektif / Corrective Action"}
	colWidths := []uint{2, 4, 8, 3, 3, 8}

	var tableRows [][]string
	for i, inc := range incidents {
		code := ""
		if inc.Code != nil {
			code = *inc.Code
		}
		tableRows = append(tableRows, []string{
			strconv.Itoa(i + 1),
			code,
			truncate(inc.Title, maxTitleLen),
			inc.Severity,
			inc.Status,
			truncate(inc.CorrectiveAction, 80),
		})
	}

	m.AddRows(RenderTable(header, tableRows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(2, 5))...)
	m.AddRows(row.New(SectionSpacing))
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
				Color:  MutedText,
				Family: fontfamily.Helvetica,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	kriHeader := []string{"No.", "Nama KRI / KRI Name", "Batas Bawah", "Batas Atas", "Nilai Aktual", "Status", "Risiko"}
	kriWidths := []uint{2, 6, 3, 3, 3, 3, 5}

	var kriRows [][]string
	for i, kri := range kris {
		status := kri.GetStatus()
		kriRows = append(kriRows, []string{
			strconv.Itoa(i + 1),
			truncate(kri.Name, 40),
			fmt.Sprintf("%.2f", kri.ThresholdMin),
			fmt.Sprintf("%.2f", kri.ThresholdMax),
			fmt.Sprintf("%.2f", kri.CurrentValue),
			status,
			truncate(kri.RiskTitle, 25),
		})
	}

	m.AddRows(RenderTable(kriHeader, kriRows, kriWidths, WithFontSize(FontSizeSmall), WithLeftAligned(1, 6))...)
	m.AddRows(row.New(SectionSpacing))
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

	if len(trendData) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Tidak ada data tren / No trend data available",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Helvetica,
			},
		)))
		m.AddRows(emptyRow)
		return
	}

	m.AddRows(RenderTrendChartRows(trendData)...)
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

func (r *pdfReportRenderer) addPageNumbers(m core.Maroto) {
	footerRow := row.New(8)
	footerRow.Add(col.New(gridSize).Add(text.New(
		"Laporan Risiko - Manris v2",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Helvetica,
		},
	)))
	footerRow.Add(col.New().Add(text.New(
		"Halaman: ",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Right,
			Color:  MutedText,
			Family: fontfamily.Helvetica,
		},
	)))
	footerRow.Add(col.New().Add(text.New(
		"{country}",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Helvetica,
		},
	)))
	m.AddRows(footerRow)
}

var _ service.ReportPDFRenderer = &pdfReportRenderer{}
