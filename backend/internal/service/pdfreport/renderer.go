package pdfreport

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"

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
			Family: fontfamily.Arial,
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

func (r *pdfReportRenderer) RenderFormal(ctx context.Context, data *entity.KMKFormalReportData) ([]byte, error) {
	if data == nil {
		return nil, fmt.Errorf("formal report data is required")
	}

	reportType := ""
	if data.Report != nil {
		reportType = data.Report.ReportType
	}

	pageWidth, pageHeight := formalReportDimensions(reportType)
	bottomMargin := Margin + 8
	if reportType == entity.FormalReportTypeMonitoringEvaluation {
		bottomMargin = 8
	}
	builder := config.NewBuilder().
		WithDimensions(pageWidth, pageHeight).
		WithOrientation(orientation.Vertical).
		WithLeftMargin(Margin).
		WithRightMargin(Margin).
		WithTopMargin(Margin).
		WithBottomMargin(bottomMargin)
	if reportType != entity.FormalReportTypeMonitoringEvaluation {
		builder = builder.WithPageNumber(props.PageNumber{
			Pattern: "Halaman {current} dari {total}",
			Place:   props.Bottom,
			Family:  fontfamily.Arial,
			Style:   fontstyle.Normal,
			Size:    FontSizeLabel,
			Color:   MutedText,
		})
	}
	cfg := builder.WithDefaultFont(&props.Font{
		Family: fontfamily.Arial,
		Size:   FontSizeBody,
		Style:  fontstyle.Normal,
		Color:  BlackColor,
	}).Build()

	m := maroto.New(cfg)
	if reportType == entity.FormalReportTypeMonitoringEvaluation {
		_ = m.RegisterFooter(monitoringFooterRows()...)
	}

	switch reportType {
	case entity.FormalReportTypeAnnualRiskProfile:
		r.renderFormalAnnualRiskProfile(m, data)
	case entity.FormalReportTypeSemiannualImplementation:
		r.renderFormalSemiannualImplementation(m, data)
	case entity.FormalReportTypeSemiannualSupervision:
		r.renderFormalSemiannualSupervision(m, data)
	case entity.FormalReportTypeTMPMR:
		r.renderFormalTMPMRReport(m, data)
	case entity.FormalReportTypeMonitoringEvaluation:
		r.renderFormalMonitoringEvaluation(m, data)
	default:
		r.renderFormalLegacy(m, data)
	}

	doc, err := m.Generate()
	if err != nil {
		return nil, err
	}
	return doc.GetBytes(), nil
}

func formalReportDimensions(reportType string) (float64, float64) {
	if reportType == entity.FormalReportTypeMonitoringEvaluation {
		return 215.9, 279.4
	}
	return PageWidth, PageHeight
}

func (r *pdfReportRenderer) renderFormalLegacy(m core.Maroto, data *entity.KMKFormalReportData) {
	r.addFormalCover(m, data)
	r.addFormalRiskSummary(m, data)
	r.addFormalFoundationStatus(m, data)
	r.addFormalEvidenceStatus(m, data)
	r.addFormalTMPMRSection(m, data)
	r.addFormalAppendix(m, data)
}

func (r *pdfReportRenderer) renderFormalAnnualRiskProfile(m core.Maroto, data *entity.KMKFormalReportData) {
	if data == nil || data.AnnualProfile == nil {
		r.renderFormalLegacy(m, data)
		return
	}

	profile := data.AnnualProfile
	shell := &entity.KMKFormalReportData{
		Report:       profile.Report,
		GeneratedAt:  profile.Summary.GeneratedAt,
		Organization: profile.Organization,
		Period:       profile.Summary.Cycle,
		RiskSummary:  profile.Summary,
	}

	r.addFormalCover(m, shell)
	r.addAnnualRiskProfileSummary(m, profile)
	r.addAnnualTopRisksTable(m, profile)
	r.addAnnualMitigationPlanTable(m, profile)
	r.addAnnualPreviousCycleComparison(m, profile)
	r.addAnnualHeatmapAppendix(m, profile)
}

func (r *pdfReportRenderer) renderFormalSemiannualImplementation(m core.Maroto, data *entity.KMKFormalReportData) {
	if data == nil {
		r.addFormalCover(m, data)
		return
	}

	implData := data.ImplementationReport
	if implData == nil {
		// Fallback: render with generic data shell but skip annual/TMPMR sections
		r.addFormalCover(m, data)
		r.addImplementationStageOverview(m, data)
		r.addImplementationEvidenceMatrix(m, data)
		r.addImplementationMitigationProgress(m, data)
		r.addImplementationGapSummary(m, data)
		return
	}

	shell := &entity.KMKFormalReportData{
		Report:        implData.Report,
		GeneratedAt:   implData.Summary.GeneratedAt,
		Organization:  implData.Organization,
		Period:        implData.Summary.Cycle,
		RiskSummary:   implData.Summary,
		SectionStatus: implData.SectionStatus,
	}

	r.addFormalCover(m, shell)
	r.addImplementationStageOverview(m, data)
	r.addImplementationEvidenceMatrix(m, data)
	r.addImplementationMitigationProgress(m, data)
	r.addImplementationGapSummary(m, data)
}

func (r *pdfReportRenderer) renderFormalSemiannualSupervision(m core.Maroto, data *entity.KMKFormalReportData) {
	if data == nil {
		r.addFormalCover(m, data)
		return
	}

	supData := data.SupervisionReport
	if supData == nil {
		// Fallback: render with generic data shell but skip annual/TMPMR sections
		r.addFormalCover(m, data)
		r.addSupervisionExecutiveSummary(m, data)
		r.addSupervisionFindingsTable(m, data)
		r.addSupervisionImprovementRecommendations(m, data)
		r.addSupervisionFollowUpStatus(m, data)
		return
	}

	shell := &entity.KMKFormalReportData{
		Report:        supData.Report,
		GeneratedAt:   supData.Summary.GeneratedAt,
		Organization:  supData.Organization,
		Period:        supData.Summary.Cycle,
		RiskSummary:   supData.Summary,
		SectionStatus: supData.SectionStatus,
	}

	r.addFormalCover(m, shell)
	r.addSupervisionExecutiveSummary(m, data)
	r.addSupervisionFindingsTable(m, data)
	r.addSupervisionImprovementRecommendations(m, data)
	r.addSupervisionFollowUpStatus(m, data)
}

func (r *pdfReportRenderer) renderFormalTMPMRReport(m core.Maroto, data *entity.KMKFormalReportData) {
	if data == nil || data.TMPMRReport == nil {
		r.renderFormalLegacy(m, data)
		return
	}

	reportData := data.TMPMRReport
	shell := &entity.KMKFormalReportData{
		Report:       reportData.Report,
		GeneratedAt:  reportData.Summary.GeneratedAt,
		Organization: reportData.Organization,
		Period:       reportData.Summary.Cycle,
		RiskSummary:  reportData.Summary,
		TMPMR:        reportData.TMPMR,
	}

	r.addFormalCover(m, shell)
	r.addTMPMRScoreSummary(m, reportData)
	r.addTMPMRDimensionTable(m, reportData)
	r.addTMPMREvidenceTable(m, reportData)
	r.addTMPMRImprovementPriorities(m, reportData)
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
			Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
				},
			))
			innerCol.Add(text.New(
				kpi.value,
				props.Text{
					Size:   FontSizeH1,
					Align:  align.Center,
					Color:  BlackColor,
					Family: fontfamily.Arial,
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
				Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
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
				Family: fontfamily.Arial,
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
				Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
					Family: fontfamily.Arial,
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
						Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
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
				Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
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
				Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
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
				Family: fontfamily.Arial,
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
			Family: fontfamily.Arial,
		},
	)))
	footerRow.Add(col.New().Add(text.New(
		"Halaman: ",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Right,
			Color:  MutedText,
			Family: fontfamily.Arial,
		},
	)))
	footerRow.Add(col.New().Add(text.New(
		"{country}",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(footerRow)
}

func (r *pdfReportRenderer) addFormalCover(m core.Maroto, data *entity.KMKFormalReportData) {
	reportType := formatFormalReportType(data.Report)
	orgName := "Tidak tersedia"
	if data.Organization != nil && strings.TrimSpace(data.Organization.Name) != "" {
		orgName = data.Organization.Name
	}
	generatedAt := "Tidak tersedia"
	if !data.GeneratedAt.IsZero() {
		generatedAt = data.GeneratedAt.Format("02 Jan 2006, 15:04")
	}

	kpis := []struct {
		label string
		value string
	}{
		{"Organisasi", orgName},
		{"Periode", data.Period},
		{"Dihasilkan pada", generatedAt},
		{"Status", "-"},
	}
	if data.Report != nil {
		kpis[3].value = strings.ToUpper(data.Report.Status)
	}

	eyebrowRow := row.New(FontSizeLabel + 2)
	eyebrowRow.Add(col.New(gridSize).Add(text.New(
		"DOKUMEN RESMI",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  MutedText,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(eyebrowRow)

	titleRow := row.New(FontSizeH1 + 2)
	titleRow.Add(col.New(gridSize).Add(text.New(
		"Laporan Formal KMK",
		props.Text{
			Size:   FontSizeH1 + 2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(titleRow)

	subtitleRow := row.New(FontSizeBody + 2)
	subtitleRow.Add(col.New(gridSize).Add(text.New(
		reportType,
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(subtitleRow)

	introRow := row.New(FontSizeBody + 2)
	introRow.Add(col.New(gridSize).Add(text.New(
		"Ringkasan ini disusun untuk pembacaan, pencetakan, dan arsip resmi.",
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Left,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(introRow)
	m.AddRows(row.New(6))

	metaRows := [][]string{
		{kpis[0].label, kpis[0].value},
		{kpis[1].label, kpis[1].value},
		{kpis[2].label, kpis[2].value},
		{kpis[3].label, kpis[3].value},
	}
	m.AddRows(RenderTable([]string{"Informasi", "Nilai"}, metaRows, []uint{4, 8}, WithFontSize(FontSizeBody), WithLeftAligned(0, 1))...)

	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addFormalRiskSummary(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Ringkasan Profil Risiko / Risk Profile Summary",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	summary := data.RiskSummary
	kpis := []struct {
		label string
		value string
	}{
		{"Total Risiko", strconv.Itoa(summary.TotalRisks)},
		{"Tinggi & Ekstrem", strconv.Itoa(summary.HighExtremeCount)},
		{"Mitigasi Terlambat", strconv.Itoa(summary.OverdueMitigations)},
		{"Skor Eksposur Rata-rata", fmt.Sprintf("%.1f", summary.AvgExposureScore)},
	}

	kpiRow := row.New(RowHeight + 6)
	for _, kpi := range kpis {
		innerCol := col.New(3)
		innerCol.Add(text.New(
			kpi.label,
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		))
		innerCol.Add(text.New(
			kpi.value,
			props.Text{
				Size:   FontSizeH1,
				Align:  align.Center,
				Color:  BlackColor,
				Family: fontfamily.Arial,
				Style:  fontstyle.Bold,
			},
		))
		innerCol.WithStyle(CellBorder())
		kpiRow.Add(innerCol)
	}
	m.AddRows(kpiRow)

	if len(summary.CategoryBreakdown) > 0 {
		categoryRow := row.New(RowHeight)
		categoryRow.Add(col.New(3).Add(text.New(
			"Kategori Risiko",
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Left,
				Color:  MutedText,
				Family: fontfamily.Arial,
				Style:  fontstyle.Bold,
			},
		)))
		categoriesCol := col.New(9)
		for category, count := range summary.CategoryBreakdown {
			categoriesCol.Add(text.New(
				fmt.Sprintf("%s (%d)  ", category, count),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Arial,
				},
			))
		}
		categoryRow.Add(categoriesCol)
		m.AddRows(categoryRow)
	}

	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addFormalFoundationStatus(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Status Piagam / Konteks / Sasaran",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	rows := selectFormalSectionStatuses(data.SectionStatus, []string{"charter", "context", "objective"})
	if len(rows) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada status piagam/konteks/sasaran",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	header := []string{"Bagian", "Status", "Jumlah", "Catatan"}
	colWidths := []uint{5, 3, 2, 2}
	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(0, 3))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addFormalEvidenceStatus(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Status Evidence Pendukung Lintas Modul",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	rows := sectionStatusesToRows(data.SectionStatus)
	if len(rows) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada evidence pendukung yang tersedia",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	header := []string{"Key", "Label", "Tersedia", "Jumlah", "Catatan"}
	colWidths := []uint{3, 4, 2, 1, 2}
	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1, 4))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addFormalTMPMRSection(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"TMPMR / Tingkat Kematangan Manajemen Risiko",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	tmpmr := data.TMPMR
	if tmpmr == nil {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada hasil TMPMR",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	scoreRow := row.New(RowHeight + 2)
	scoreRow.Add(col.New(4).Add(text.New(
		"Skor TMPMR",
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Arial,
			Style:  fontstyle.Bold,
		},
	)))
	scoreRow.Add(col.New(2).Add(text.New(
		fmt.Sprintf("%.2f", tmpmr.Score),
		props.Text{
			Size:   FontSizeH1,
			Align:  align.Left,
			Color:  BlackColor,
			Family: fontfamily.Arial,
			Style:  fontstyle.Bold,
		},
	)))
	scoreRow.Add(col.New(3).Add(text.New(
		"Tingkat",
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Arial,
			Style:  fontstyle.Bold,
		},
	)))
	scoreRow.Add(col.New(3).Add(text.New(
		tmpmr.MaturityLevel,
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Left,
			Color:  BlackColor,
			Family: fontfamily.Arial,
			Style:  fontstyle.Bold,
		},
	)))
	m.AddRows(scoreRow)

	if len(tmpmr.Items) > 0 {
		itemRows := make([][]string, 0, len(tmpmr.Items))
		for _, item := range tmpmr.Items {
			itemRows = append(itemRows, []string{
				item.Dimension,
				truncate(item.Question, 72),
				strconv.Itoa(item.Score),
				truncate(item.EvidenceURL, 40),
				truncate(item.Notes, 40),
			})
		}

		header := []string{"Dimensi", "Pertanyaan", "Skor", "Evidence", "Catatan"}
		colWidths := []uint{3, 5, 1, 1, 2}
		m.AddRows(RenderTable(header, itemRows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1, 3, 4))...)
	}

	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addFormalAppendix(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Appendix Ketersediaan Section",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	rows := sectionStatusesToRows(data.SectionStatus)
	if len(rows) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Tidak ada section untuk appendix",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		return
	}

	header := []string{"Key", "Label", "Tersedia", "Jumlah", "Catatan"}
	colWidths := []uint{3, 4, 2, 1, 2}
	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1, 4))...)
}

func (r *pdfReportRenderer) addAnnualRiskProfileSummary(m core.Maroto, data *entity.AnnualRiskProfileData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Ringkasan Profil Risiko Tahunan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	summary := data.Summary
	infoRow := row.New(RowHeight + 2)
	infoRow.Add(col.New(4).Add(text.New(
		"Perbandingan Siklus",
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Arial,
			Style:  fontstyle.Bold,
		},
	)))
	infoRow.Add(col.New(8).Add(text.New(
		defaultIfEmpty(data.PreviousCycle, "Belum tersedia"),
		props.Text{
			Size:   FontSizeBody,
			Align:  align.Left,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(infoRow)

	kpis := []struct {
		label string
		value string
	}{
		{"Total Risiko", strconv.Itoa(summary.TotalRisks)},
		{"Tinggi & Ekstrem", strconv.Itoa(summary.HighExtremeCount)},
		{"Mitigasi Terlambat", strconv.Itoa(summary.OverdueMitigations)},
		{"Skor Eksposur Rata-rata", fmt.Sprintf("%.1f", summary.AvgExposureScore)},
	}

	kpiRow := row.New(RowHeight + 6)
	for _, kpi := range kpis {
		innerCol := col.New(3)
		innerCol.Add(text.New(
			kpi.label,
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		))
		innerCol.Add(text.New(
			kpi.value,
			props.Text{
				Size:   FontSizeH1,
				Align:  align.Center,
				Color:  BlackColor,
				Family: fontfamily.Arial,
				Style:  fontstyle.Bold,
			},
		))
		innerCol.WithStyle(CellBorder())
		kpiRow.Add(innerCol)
	}
	m.AddRows(kpiRow)

	if len(summary.CategoryBreakdown) > 0 {
		categoriesRow := row.New(RowHeight)
		categoriesRow.Add(col.New(3).Add(text.New(
			"Kategori Risiko",
			props.Text{
				Size:   FontSizeSmall,
				Align:  align.Left,
				Color:  MutedText,
				Family: fontfamily.Arial,
				Style:  fontstyle.Bold,
			},
		)))
		categoriesCol := col.New(9)
		for category, count := range summary.CategoryBreakdown {
			categoriesCol.Add(text.New(
				fmt.Sprintf("%s (%d)  ", category, count),
				props.Text{
					Size:   FontSizeSmall,
					Align:  align.Left,
					Color:  BlackColor,
					Family: fontfamily.Arial,
				},
			))
		}
		categoriesRow.Add(categoriesCol)
		m.AddRows(categoriesRow)
	}

	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addAnnualTopRisksTable(m core.Maroto, data *entity.AnnualRiskProfileData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Top Risiko Prioritas Tahunan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	if len(data.TopRisks) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada risiko prioritas untuk ditampilkan",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	header := []string{"No.", "Kode", "Judul / Title", "Level", "Skor", "Mitigasi"}
	colWidths := []uint{2, 4, 8, 3, 2, 3}

	var rows [][]string
	for i, risk := range data.TopRisks {
		if risk == nil {
			continue
		}
		rows = append(rows, []string{
			strconv.Itoa(i + 1),
			risk.Code,
			truncate(risk.Title, maxTitleLen),
			risk.GetRiskLevel(),
			strconv.Itoa(risk.GetEffectiveScore()),
			strconv.Itoa(len(risk.Mitigations)),
		})
	}

	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(2, 3, 4))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addAnnualMitigationPlanTable(m core.Maroto, data *entity.AnnualRiskProfileData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Rencana Mitigasi Tahunan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	if len(data.TopRisks) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada rencana mitigasi yang dapat dirangkum",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	header := []string{"Risiko", "Penanganan", "Kontrol", "Tenggat"}
	colWidths := []uint{6, 4, 4, 2}

	rows := make([][]string, 0, len(data.TopRisks))
	for _, risk := range data.TopRisks {
		if risk == nil {
			continue
		}
		dueDate := "-"
		if len(risk.Mitigations) > 0 && risk.Mitigations[0].DueDate != nil {
			dueDate = *risk.Mitigations[0].DueDate
		}
		plan := defaultIfEmpty(risk.TreatmentOption, "Belum ditetapkan")
		control := defaultIfEmpty(risk.ExistingControl, "Belum dicatat")
		rows = append(rows, []string{
			truncate(risk.Title, 40),
			truncate(plan, 28),
			truncate(control, 28),
			dueDate,
		})
	}

	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1, 2))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addAnnualPreviousCycleComparison(m core.Maroto, data *entity.AnnualRiskProfileData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Perbandingan dengan Siklus Sebelumnya",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	prevCycle := defaultIfEmpty(data.PreviousCycle, "Belum tersedia")
	rows := [][]string{
		{"Siklus saat ini", data.Summary.Cycle},
		{"Siklus sebelumnya", prevCycle},
		{"Status pembanding", "Data pembanding numerik belum termodelkan"},
	}
	m.AddRows(RenderTable([]string{"Keterangan", "Nilai"}, rows, []uint{6, 6}, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1))...)
	m.AddRows(row.New(SectionSpacing))
}

// Implementation Report Section Helpers

// addImplementationStageOverview renders the KMK process stage overview for the
// semiannual implementation report. It uses the ISO 31000:2018 clause structure.
func (r *pdfReportRenderer) addImplementationStageOverview(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Tahapan Proses Penerapan MR",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	implData := data.ImplementationReport
	if implData != nil && len(implData.SectionStatus) > 0 {
		headerCols := []string{"Klausul", "Tahapan", "Status", "Jumlah", "Keterangan"}
		colWidths := []uint{2, 5, 2, 1, 2}
		rows := make([][]string, 0, len(implData.SectionStatus))
		for _, section := range implData.SectionStatus {
			statusLabel := "Belum"
			if section.Available {
				statusLabel = "Terpenuhi"
			}
			note := section.Note
			if note == "" {
				note = "-"
			}
			rows = append(rows, []string{
				clauseFromKey(section.Key),
				section.Label,
				statusLabel,
				strconv.Itoa(section.Count),
				note,
			})
		}
		m.AddRows(RenderTable(headerCols, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(1, 4))...)
	} else {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum tersedia di sistem",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
	}

	m.AddRows(row.New(SectionSpacing))
}

// addImplementationEvidenceMatrix renders the evidence matrix by KMK process stage.
func (r *pdfReportRenderer) addImplementationEvidenceMatrix(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Matriks Evidence per Tahapan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	implData := data.ImplementationReport
	hasEvidence := false
	if implData != nil {
		for _, section := range implData.SectionStatus {
			if section.Available {
				hasEvidence = true
				break
			}
		}
	}

	if !hasEvidence {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum tersedia di sistem",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	if implData != nil && len(implData.SectionStatus) > 0 {
		headerCols := []string{"Klausul", "Tahapan", "Ketersediaan", "Catatan"}
		colWidths := []uint{2, 5, 3, 2}
		rows := make([][]string, 0, len(implData.SectionStatus))
		for _, section := range implData.SectionStatus {
			klausul := clauseFromKey(section.Key)
			tahap := section.Label
			avail := "Belum Tersedia"
			if section.Available {
				avail = fmt.Sprintf("Tersedia (%d)", section.Count)
			}
			note := defaultIfEmpty(section.Note, "-")
			rows = append(rows, []string{klausul, tahap, avail, note})
		}
		m.AddRows(RenderTable(headerCols, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(1, 3))...)
	}

	m.AddRows(row.New(SectionSpacing))
}

// addImplementationMitigationProgress renders mitigation progress by KMK process stage.
func (r *pdfReportRenderer) addImplementationMitigationProgress(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Progres Penanganan Risiko",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	implData := data.ImplementationReport
	var totalRisks, risksWithTreatment, risksWithMitigation int

	if implData != nil && len(implData.SectionStatus) > 0 {
		for _, section := range implData.SectionStatus {
			if section.Key == "risk_identification" {
				totalRisks = section.Count
			}
			if section.Key == "risk_treatment" {
				risksWithTreatment = section.Count
			}
			if section.Key == "monitoring_review" {
				risksWithMitigation = section.Count
			}
		}
	}

	if totalRisks == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum tersedia di sistem",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	rows := [][]string{
		{"Total Risiko Teridentifikasi", strconv.Itoa(totalRisks)},
		{"Risiko dengan Rencana Penanganan", strconv.Itoa(risksWithTreatment)},
		{"Total Aktivitas Mitigasi Tercatat", strconv.Itoa(risksWithMitigation)},
		{"Persentase dengan Penanganan", fmtProgressPercent(risksWithTreatment, totalRisks)},
	}
	m.AddRows(RenderTable([]string{"Indikator", "Nilai"}, rows, []uint{6, 6}, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1))...)
	m.AddRows(row.New(SectionSpacing))
}

// addImplementationGapSummary renders the gap summary for implementation report.
func (r *pdfReportRenderer) addImplementationGapSummary(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Ringkasan Gap Implementasi",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	implData := data.ImplementationReport
	var gaps []string

	if implData != nil && len(implData.SectionStatus) > 0 {
		for _, section := range implData.SectionStatus {
			if !section.Available {
				gaps = append(gaps, section.Label)
			}
		}
	}

	if len(gaps) == 0 {
		noGapRow := row.New(RowHeight + 2)
		noGapRow.Add(col.New(gridSize).Add(text.New(
			"Seluruh tahapan KMK telah tersedia",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  BlackColor,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(noGapRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	gapRows := make([][]string, 0, len(gaps))
	for i, gap := range gaps {
		gapRows = append(gapRows, []string{strconv.Itoa(i + 1), gap})
	}
	m.AddRows(RenderTable([]string{"No.", "Tahapan yang Belum Tersedia"}, gapRows, []uint{1, 11}, WithFontSize(FontSizeSmall), WithLeftAligned(1))...)
	m.AddRows(row.New(SectionSpacing))
}

// clauseFromKey maps section keys to ISO 31000:2018 clause numbers.
func clauseFromKey(key string) string {
	switch key {
	case "communication_consultation":
		return "4.1"
	case "context_criteria":
		return "5.1"
	case "risk_identification":
		return "5.2"
	case "risk_analysis_evaluation":
		return "5.3/5.4"
	case "risk_treatment":
		return "5.5"
	case "monitoring_review":
		return "5.6/8.2"
	case "recording_reporting":
		return "5.7/7.5"
	default:
		return "-"
	}
}

func fmtProgressPercent(part, total int) string {
	if total == 0 {
		return "0%"
	}
	return fmt.Sprintf("%d%%", (part*100)/total)
}

// Supervision Report Section Helpers

// addSupervisionExecutiveSummary renders the executive summary for the supervision report.
// Uses findings-oriented tone, not process-stage terminology.
func (r *pdfReportRenderer) addSupervisionExecutiveSummary(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Ringkasan Eksekutif Pengawasan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	supData := data.SupervisionReport
	if supData != nil && len(supData.SectionStatus) > 0 {
		// Derive executive summary from supervision section statuses
		var findingCount, overdueCount, bottleneckCount int
		var findingAvailable, overdueAvailable bool

		for _, section := range supData.SectionStatus {
			switch section.Key {
			case "findings":
				findingCount = section.Count
				findingAvailable = section.Available
			case "overdue_mitigations":
				overdueCount = section.Count
				overdueAvailable = section.Available
			case "approval_bottlenecks":
				bottleneckCount = section.Count
			}
		}

		// Compute overall status
		criticalCount := findingCount
		if !findingAvailable {
			criticalCount = 0
		}

		statusLabel := "Belum ada data pengawasan"
		if findingAvailable && findingCount > 0 {
			if overdueAvailable && overdueCount > 0 {
				statusLabel = fmt.Sprintf("Pengawasan kritis: %d temuan, %d mitigasi terlambat", findingCount, overdueCount)
			} else {
				statusLabel = fmt.Sprintf("Pengawasan berlangsung: %d temuan risiko kritis", findingCount)
			}
		}

		infoRows := [][]string{
			{"Temuan Risiko Kritis", strconv.Itoa(criticalCount)},
			{"Mitigasi Terlambat", strconv.Itoa(overdueCount)},
			{"Kendala Persetujuan", strconv.Itoa(bottleneckCount)},
			{"Status Keseluruhan", statusLabel},
		}
		m.AddRows(RenderTable([]string{"Indikator", "Nilai"}, infoRows, []uint{5, 7}, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1))...)
	} else {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum tersedia di sistem",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
	}

	m.AddRows(row.New(SectionSpacing))
}

// addSupervisionFindingsTable renders the findings table for supervision report.
func (r *pdfReportRenderer) addSupervisionFindingsTable(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Daftar Temuan Pengawasan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	supData := data.SupervisionReport
	hasFindings := false
	if supData != nil {
		for _, section := range supData.SectionStatus {
			if section.Key == "findings" && section.Available {
				hasFindings = true
				break
			}
		}
	}

	if !hasFindings {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum tersedia di sistem",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	// Fallback: render a single note row if no findings
	supervisionItems := [][]string{
		{"1", "Temuan Risiko", "Belum tersedia di sistem", "-"},
	}
	if supData != nil && len(supData.SectionStatus) > 0 {
		for _, section := range supData.SectionStatus {
			if section.Key == "findings" && section.Available && section.Count > 0 {
				supervisionItems = [][]string{
					{strconv.Itoa(section.Count), section.Label, section.Note, "Proses"},
				}
				break
			}
		}
	}

	m.AddRows(RenderTable([]string{"No.", "Kategori", "Keterangan", "Prioritas"}, supervisionItems, []uint{1, 4, 5, 2}, WithFontSize(FontSizeSmall), WithLeftAligned(1, 2))...)
	m.AddRows(row.New(SectionSpacing))
}

// addSupervisionImprovementRecommendations renders the improvement recommendations section.
func (r *pdfReportRenderer) addSupervisionImprovementRecommendations(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Saran Perbaikan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	supData := data.SupervisionReport
	var recommendations []string

	if supData != nil && len(supData.SectionStatus) > 0 {
		for _, section := range supData.SectionStatus {
			if !section.Available {
				// Generate recommendation from missing evidence
				switch section.Key {
				case "findings":
					recommendations = append(recommendations, "Segera identifikasi dan dokumentasikan risiko tinggi/ekstrem")
				case "overdue_mitigations":
					recommendations = append(recommendations, "Perbarui progres mitigasi yang melewati tenggat waktu")
				case "approval_bottlenecks":
					recommendations = append(recommendations, "Proses persetujuan risiko perlu dipercepat")
				case "evidence_completeness":
					recommendations = append(recommendations, "Lengkapi dokumentasi kontrol risiko")
				case "follow_up_status":
					recommendations = append(recommendations, "Tingkatkan pencatatan aktivitas tindak lanjut")
				}
			}
		}
	}

	if len(recommendations) == 0 {
		noRecRow := row.New(RowHeight + 2)
		noRecRow.Add(col.New(gridSize).Add(text.New(
			"Tidak ada saran perbaikan — seluruh aspek pengawasan tersedia",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  BlackColor,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(noRecRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	recRows := make([][]string, 0, len(recommendations))
	for i, rec := range recommendations {
		recRows = append(recRows, []string{strconv.Itoa(i + 1), rec})
	}
	m.AddRows(RenderTable([]string{"No.", "Saran Perbaikan"}, recRows, []uint{1, 11}, WithFontSize(FontSizeSmall), WithLeftAligned(1))...)
	m.AddRows(row.New(SectionSpacing))
}

// addSupervisionFollowUpStatus renders the follow-up status section.
func (r *pdfReportRenderer) addSupervisionFollowUpStatus(m core.Maroto, data *entity.KMKFormalReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Status Tindak Lanjut",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	supData := data.SupervisionReport
	var followUpCount int
	var followUpAvailable bool

	if supData != nil {
		for _, section := range supData.SectionStatus {
			if section.Key == "follow_up_status" {
				followUpCount = section.Count
				followUpAvailable = section.Available
				break
			}
		}
	}

	if !followUpAvailable || followUpCount == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum tersedia di sistem",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	resultRows := [][]string{
		{"Total Aktivitas Tindak Lanjut", strconv.Itoa(followUpCount)},
		{"Status", "Proses"},
		{"Catatan", "Aktivitas tercatat dari modul mitigasi"},
	}
	m.AddRows(RenderTable([]string{"Indikator", "Nilai"}, resultRows, []uint{5, 7}, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addAnnualHeatmapAppendix(m core.Maroto, data *entity.AnnualRiskProfileData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Lampiran Heatmap Tahunan",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)
	m.AddRows(RenderHeatmapGrid(data.Heatmap)...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addTMPMRScoreSummary(m core.Maroto, data *entity.TMPMRReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Ringkasan Skor TMPMR",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	tmpmr := data.TMPMR
	if tmpmr == nil {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada hasil TMPMR",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	rows := [][]string{
		{"Skor", fmt.Sprintf("%.2f", tmpmr.Score)},
		{"Tingkat kematangan", defaultIfEmpty(tmpmr.MaturityLevel, "-")},
		{"Jumlah dimensi", strconv.Itoa(len(tmpmr.Items))},
	}
	m.AddRows(RenderTable([]string{"Indikator", "Nilai"}, rows, []uint{6, 6}, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addTMPMRDimensionTable(m core.Maroto, data *entity.TMPMRReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Dimensi TMPMR",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	tmpmr := data.TMPMR
	if tmpmr == nil || len(tmpmr.Items) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada dimensi TMPMR untuk dirangkum",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	items := make([]entity.TMPMRItem, len(tmpmr.Items))
	copy(items, tmpmr.Items)
	sort.Slice(items, func(i, j int) bool {
		if items[i].Score == items[j].Score {
			return items[i].Dimension < items[j].Dimension
		}
		return items[i].Score > items[j].Score
	})

	rows := make([][]string, 0, len(items))
	for _, item := range items {
		rows = append(rows, []string{
			item.Dimension,
			strconv.Itoa(item.Score),
			truncate(item.Question, 60),
			defaultIfEmpty(item.Notes, "-"),
		})
	}

	header := []string{"Dimensi", "Skor", "Pertanyaan", "Catatan"}
	colWidths := []uint{3, 2, 5, 2}
	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(0, 2, 3))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addTMPMREvidenceTable(m core.Maroto, data *entity.TMPMRReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Bukti per Dimensi",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	tmpmr := data.TMPMR
	if tmpmr == nil || len(tmpmr.Items) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada bukti yang dapat ditampilkan",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	rows := make([][]string, 0, len(tmpmr.Items))
	for _, item := range tmpmr.Items {
		evidence := defaultIfEmpty(item.EvidenceURL, "Belum tersedia")
		if len(evidence) > 40 {
			evidence = truncate(evidence, 40)
		}
		rows = append(rows, []string{
			item.Dimension,
			evidence,
			defaultIfEmpty(item.Notes, "Tidak ada catatan"),
		})
	}

	header := []string{"Dimensi", "Bukti", "Catatan"}
	colWidths := []uint{3, 5, 4}
	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1, 2))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addTMPMRImprovementPriorities(m core.Maroto, data *entity.TMPMRReportData) {
	headerRow := row.New(FontSizeH2 + 4)
	headerRow.Add(col.New(gridSize).Add(text.New(
		"Prioritas Perbaikan TMPMR",
		props.Text{
			Size:   FontSizeH2,
			Align:  align.Left,
			Style:  fontstyle.Bold,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(headerRow)

	tmpmr := data.TMPMR
	if tmpmr == nil || len(tmpmr.Items) == 0 {
		emptyRow := row.New(RowHeight + 2)
		emptyRow.Add(col.New(gridSize).Add(text.New(
			"Belum ada prioritas perbaikan yang dapat dirangkum",
			props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Color:  MutedText,
				Family: fontfamily.Arial,
			},
		)))
		m.AddRows(emptyRow)
		m.AddRows(row.New(SectionSpacing))
		return
	}

	items := make([]entity.TMPMRItem, len(tmpmr.Items))
	copy(items, tmpmr.Items)
	sort.Slice(items, func(i, j int) bool {
		if items[i].Score == items[j].Score {
			return items[i].Dimension < items[j].Dimension
		}
		return items[i].Score < items[j].Score
	})

	if len(items) > 5 {
		items = items[:5]
	}

	rows := make([][]string, 0, len(items))
	for i, item := range items {
		recommendation := defaultIfEmpty(item.Notes, "Perlu tindak lanjut")
		rows = append(rows, []string{
			strconv.Itoa(i + 1),
			item.Dimension,
			strconv.Itoa(item.Score),
			truncate(recommendation, 40),
		})
	}

	header := []string{"No.", "Dimensi", "Skor", "Prioritas"}
	colWidths := []uint{1, 4, 2, 5}
	m.AddRows(RenderTable(header, rows, colWidths, WithFontSize(FontSizeSmall), WithLeftAligned(1, 3))...)
	m.AddRows(row.New(SectionSpacing))
}

func (r *pdfReportRenderer) addFormalPageNumbers(m core.Maroto) {
	footerRow := row.New(8)
	footerRow.Add(col.New(gridSize).Add(text.New(
		"Laporan Formal KMK - Manris v2",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Arial,
		},
	)))
	footerRow.Add(col.New().Add(text.New(
		"Halaman: ",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Right,
			Color:  MutedText,
			Family: fontfamily.Arial,
		},
	)))
	footerRow.Add(col.New().Add(text.New(
		"{country}",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Left,
			Color:  MutedText,
			Family: fontfamily.Arial,
		},
	)))
	m.AddRows(footerRow)
}

func selectFormalSectionStatuses(statuses []entity.KMKReportSectionStatus, keywords []string) [][]string {
	var rows [][]string
	for _, section := range statuses {
		needle := strings.ToLower(section.Key + " " + section.Label + " " + section.Note)
		if len(keywords) > 0 {
			matched := false
			for _, keyword := range keywords {
				if strings.Contains(needle, strings.ToLower(keyword)) {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}
		rows = append(rows, []string{
			renderFormalStatusLabel(section),
			renderFormalAvailability(section.Available),
			strconv.Itoa(section.Count),
			section.Note,
		})
	}

	if len(rows) == 0 && len(statuses) > 0 {
		limit := len(statuses)
		if limit > 3 {
			limit = 3
		}
		for i := 0; i < limit; i++ {
			section := statuses[i]
			rows = append(rows, []string{
				renderFormalStatusLabel(section),
				renderFormalAvailability(section.Available),
				strconv.Itoa(section.Count),
				section.Note,
			})
		}
	}
	return rows
}

func sectionStatusesToRows(statuses []entity.KMKReportSectionStatus) [][]string {
	rows := make([][]string, 0, len(statuses))
	for _, section := range statuses {
		rows = append(rows, []string{
			defaultIfEmpty(section.Key, "-"),
			renderFormalStatusLabel(section),
			renderFormalAvailability(section.Available),
			strconv.Itoa(section.Count),
			defaultIfEmpty(section.Note, "-"),
		})
	}
	return rows
}

func renderFormalStatusLabel(section entity.KMKReportSectionStatus) string {
	label := strings.TrimSpace(section.Label)
	if label == "" {
		label = strings.Title(strings.ReplaceAll(section.Key, "_", " "))
	}
	return label
}

func renderFormalAvailability(available bool) string {
	if available {
		return "Ada"
	}
	return "Belum"
}

func defaultIfEmpty(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func formatFormalReportType(report *entity.FormalReport) string {
	if report == nil {
		return "Jenis laporan / Report type: tidak tersedia"
	}

	var label string
	switch report.ReportType {
	case entity.FormalReportTypeAnnualRiskProfile:
		label = "Profil Risiko Tahunan"
	case entity.FormalReportTypeSemiannualImplementation:
		label = "Laporan Penerapan Manajemen Risiko Semesteran"
	case entity.FormalReportTypeSemiannualSupervision:
		label = "Laporan Pengawasan Manajemen Risiko Semesteran"
	case entity.FormalReportTypeTMPMR:
		label = "Laporan TMPMR"
	default:
		label = report.ReportType
	}

	return "Jenis laporan / Report type: " + label
}

var _ service.ReportPDFRenderer = &pdfReportRenderer{}
var _ service.FormalReportPDFRenderer = &pdfReportRenderer{}
