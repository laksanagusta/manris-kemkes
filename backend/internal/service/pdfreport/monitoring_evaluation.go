package pdfreport

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/page"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/breakline"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/manris/backend/internal/domain/entity"
)

const monitoringFooterText = "Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN)."

const (
	monitoringBodyFontSize  = 10.5
	monitoringTableFontSize = 9.2
	monitoringTextIndent    = 7.0
	monitoringCheckMark     = "4"
)

func (r *pdfReportRenderer) renderFormalMonitoringEvaluation(m core.Maroto, data *entity.KMKFormalReportData) {
	report := data.MonitoringEvaluationReport
	if report == nil {
		report = &entity.MonitoringEvaluationReportData{}
	}

	r.addMonitoringCover(m, report)
	addMonitoringPageBreak(m)
	r.addMonitoringIntro(m, report)
	r.addMonitoringDocumentSection(m, report)
	r.addMonitoringInfrastructureSection(m, report)
	r.addMonitoringResultSection(m, report)
	r.addMonitoringMitigationSection(m, report)
	r.addMonitoringClosing(m, report)
}

func (r *pdfReportRenderer) addMonitoringCover(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	m.AddRows(row.New(10))
	addMonitoringCenteredText(m, "LAPORAN HASIL PEMANTAUAN DAN EVALUASI", 15, true)
	addMonitoringCenteredText(m, "PENERAPAN MANAJEMEN RISIKO", 15, true)
	m.AddRows(row.New(22))
	addMonitoringCenteredText(m, "PADA", 14, true)
	addMonitoringCenteredText(m, "SATUAN KERJA "+strings.ToUpper(defaultIfEmpty(data.OrganizationName, "")), 14, true)
	addMonitoringCenteredText(m, defaultIfEmpty(data.SemesterLabel, ""), 14, true)
	addMonitoringCenteredText(m, "TAHUN "+defaultIfEmpty(data.Year, ""), 14, true)

	m.AddRows(row.New(52))
	addMonitoringPair(m, "Nomor", defaultIfEmpty(data.ReportNumber, ""))
	addMonitoringPair(m, "Tanggal", defaultIfEmpty(data.ReportDate, ""))
	addMonitoringPair(m, "Status", defaultIfEmpty(data.EvaluationStatus, ""))

	m.AddRows(row.New(38))
	addMonitoringIdentityBox(m, data)
}

func (r *pdfReportRenderer) addMonitoringIntro(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "Yth. Kepala Satuan "+defaultIfEmpty(data.OrganizationName, ""))
	addMonitoringParagraph(m, "Kementerian Kesehatan")
	addMonitoringParagraph(m, defaultIfEmpty(data.UnitAddress, ""))
	addMonitoringParagraph(m, "")
	addMonitoringParagraph(m, "Sesuai surat tugas tanggal "+defaultIfEmpty(data.AssignmentLetterDate, "")+" nomor "+defaultIfEmpty(data.AssignmentLetterNumber, "")+" kami telah melakukan pemantauan dan evaluasi penerapan Manajemen Risiko dengan hasil sebagai berikut :")
	addMonitoringParagraph(m, "")

	addMonitoringNumberedSection(m, "1.", "Dasar Pelaksanaan Pemantauan dan Evaluasi", []string{
		"Peraturan Pemerintah Nomor 60 Tahun 2008 tentang Sistem Pengendalian Intern Pemerintah;",
		"Peraturan Menteri Kesehatan Republik Indonesia nomor 84 tahun 2019 tentang Tata Kelola Pengawasan Intern di Lingkungan Kementerian Kesehatan;",
		"Peraturan Menteri Kesehatan Republik Indonesia Nomor 21 Tahun 2024 tentang Organisasi dan Tata Kerja Kementerian Kesehatan;",
		"Keputusan Menteri Kesehatan Nomor 1354 tahun 2024 tentang Penerapan Manajemen Risiko di lingkungan Kementerian Kesehatan;",
		"Keputusan Inspektur Jenderal Nomor HK.02.02/G/432/2025 tentang pedoman pemantauan dan Evaluasi penerapan Manajemen Risiko.",
	})
	addMonitoringParagraph(m, "")
	addMonitoringNumberedSection(m, "2.", "Tujuan Pemantauan dan Evaluasi", []string{
		"Memastikan efektivitas pelaksanaan rencana manajemen risiko dalam mencapai tujuan organisasi.",
		"Meningkatkan kualitas pengelolaan risiko melalui identifikasi kelemahan dan rekomendasi perbaikan.",
		"Memberikan keyakinan yang memadai kepada pimpinan atas efektivitas pengendalian intern dan manajemen risiko.",
		"Mendorong perbaikan berkelanjutan dalam menghadapi perubahan lingkungan dan perkembangan risiko.",
		"Menilai tingkat kematangan penerapan manajemen risiko di seluruh unit kerja.",
	})
	addMonitoringParagraph(m, "")
	addMonitoringNumberedSection(m, "3.", "Sasaran dan Ruang Lingkup Pemantauan dan Evaluasi", []string{
		"Sasaran pemantauan dan evaluasi adalah penerapan manajemen risiko pada satuan kerja.",
		"Ruang lingkup meliputi infrastruktur manajemen risiko dan hasil kegiatan pengendalian risiko.",
	})
	addMonitoringParagraph(m, "")
	addMonitoringNumberedSection(m, "4.", "Metodologi Pemantauan dan Evaluasi", []string{
		"Reviu dokumen.",
		"Wawancara.",
		"Observasi.",
		"Konfirmasi atau klarifikasi.",
	})
	addMonitoringParagraph(m, "")
	addMonitoringParagraph(m, "5. Waktu Pemantauan dan Evaluasi")
	addMonitoringParagraph(m, "Pemantauan dan Evaluasi dilaksanakan "+defaultIfEmpty(data.MonitoringDateRange, "")+".")
	addMonitoringParagraph(m, "")
	addMonitoringParagraph(m, "6. Susunan Tim Pemantauan dan Evaluasi")
	addMonitoringParagraph(m, "Koordinator :")
	addMonitoringParagraph(m, "Ketua Tim Reviu :")
	addMonitoringParagraph(m, "Anggota Tim Reviu :")
	addMonitoringParagraph(m, "")
	addMonitoringParagraph(m, "7. Identitas Unit Kerja")
	addMonitoringParagraph(m, "Nama Unit Kerja : "+defaultIfEmpty(data.OrganizationName, ""))
	addMonitoringParagraph(m, "Alamat : "+defaultIfEmpty(data.UnitAddress, ""))
	addMonitoringParagraph(m, "Nama Pimpinan : "+defaultIfEmpty(data.UnitLeaderName, ""))
	addMonitoringParagraph(m, "")
}

func (r *pdfReportRenderer) addMonitoringDocumentSection(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "8. Hasil Pemantauan dan Evaluasi")
	addMonitoringParagraph(m, "a. Kelengkapan dokumen pendukung pemantauan dan evaluasi penerapan manajemen risiko")
	addMonitoringChecklistTable(m, []string{"No", "Dokumen", "Ya", "Tidak", "Uraian Kondisi", "Keterangan"}, data.DocumentChecklist)
	addMonitoringParagraph(m, "Kesimpulan : "+defaultIfEmpty(data.DocumentConclusion, "Infrastruktur pendukung penerapan manajemen risiko telah lengkap."))
}

func (r *pdfReportRenderer) addMonitoringInfrastructureSection(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "b. Pengujian atas kecukupan infrastruktur / rancangan proses MR")
	addMonitoringChecklistTable(m, []string{"No", "Infrastruktur", "Ya", "Tidak", "Uraian Kondisi", "Hasil Analisa"}, data.InfrastructureChecklist)
	addMonitoringParagraph(m, "Kesimpulan : "+defaultIfEmpty(data.InfrastructureConclusion, "Infrastruktur pendukung penerapan manajemen risiko telah mendukung kerangka kerja manajemen risiko organisasi secara komprehensif."))
}

func (r *pdfReportRenderer) addMonitoringResultSection(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "c. Pengujian atas hasil pelaksanaan manajemen risiko")
	addMonitoringChecklistTable(m, []string{"No", "Infrastruktur", "Ya", "Tidak", "Uraian Kondisi", "Keterangan"}, data.ResultChecklist)
	addMonitoringParagraph(m, "Kesimpulan : "+defaultIfEmpty(data.ResultConclusion, "Pelaksanaan manajemen risiko telah efektif."))
}

func (r *pdfReportRenderer) addMonitoringMitigationSection(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "d. Format pemantauan pelaksanaan mitigasi risiko")
	rows := make([][]string, 0, len(data.MitigationSummary))
	for _, item := range data.MitigationSummary {
		rows = append(rows, []string{
			item.No,
			item.LevelLabel,
			strconv.Itoa(item.RiskCount),
			strconv.Itoa(item.MitigationPlanCount),
			strconv.Itoa(item.MitigationRealizationCount),
			strconv.Itoa(item.DownCount),
			strconv.Itoa(item.SameCount),
			strconv.Itoa(item.UpCount),
			strconv.Itoa(item.NewCount),
		})
	}
	m.AddRows(buildMonitoringMitigationTableRows(rows, data.MitigationSummary)...)
	addMonitoringParagraph(m, "Kesimpulan :")
	for idx, item := range data.MitigationSummary {
		if item.Total {
			continue
		}
		addMonitoringParagraph(m, fmt.Sprintf("%d. %s", idx+1, item.LevelLabel))
		addMonitoringIndentedParagraph(m, fmt.Sprintf("Hasil pemantauan dan evaluasi untuk %s sebagai berikut:", strings.ToLower(item.LevelLabel)), 10)
		addMonitoringIndentedParagraph(m, fmt.Sprintf("a. Jumlah %s sebanyak %d risiko dengan rencana mitigasi sebanyak %d rencana.", strings.ToLower(item.LevelLabel), item.RiskCount, item.MitigationPlanCount), 16)
		addMonitoringIndentedParagraph(m, fmt.Sprintf("b. Jumlah mitigasi risiko yang sudah dilaksanakan sebanyak %d mitigasi.", item.MitigationRealizationCount), 16)
		addMonitoringIndentedParagraph(m, fmt.Sprintf("c. Hasil intervensi risiko menunjukkan risiko yang berhasil diturunkan sebanyak %d risiko, risiko yang menetap sebanyak %d risiko, dan risiko yang menunjukkan peningkatan sebanyak %d risiko.", item.DownCount, item.SameCount, item.UpCount), 16)
		addMonitoringIndentedParagraph(m, fmt.Sprintf("d. Terdapat %d risiko baru yang belum dilakukan analisis risiko.", item.NewCount), 16)
		m.AddRows(row.New(4))
	}
}

func (r *pdfReportRenderer) addMonitoringClosing(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "9. Permasalahan")
	addMonitoringParagraph(m, "-")
	addMonitoringParagraph(m, "10. Saran Perbaikan")
	addMonitoringParagraph(m, defaultIfEmpty(data.MitigationConclusion, "Berdasarkan hasil pemantauan diatas, diharapkan tim kerja dapat memonitoring kembali risiko yang masih menetap dengan memperhatikan kembali pengendalian yang harus dilakukan."))
	addMonitoringParagraph(m, fmt.Sprintf("Kami menyampaikan terima kasih atas bantuan dan kerja sama dari seluruh pejabat/pegawai pada satuan kerja %s atas kesediannya memberikan data/dokumen yang diperlukan, sehingga kegiatan pemantauan dan evaluasi penerapan manajemen risiko ini dapat terlaksana.", defaultIfEmpty(data.OrganizationName, "")))
	addMonitoringParagraph(m, "Demikian laporan hasil pemantauan dan evaluasi penerapan manajemen risiko ini disampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.")
	m.AddRows(row.New(8))
	addMonitoringSignatureBlock(m, data)
}

func addMonitoringChecklistTable(m core.Maroto, headers []string, rows []entity.MonitoringEvaluationChecklistRow) {
	m.AddRows(row.New(3))
	m.AddRows(buildMonitoringChecklistTableRows(headers, rows)...)
	m.AddRows(row.New(3))
}

func buildMonitoringChecklistTableRows(headers []string, rows []entity.MonitoringEvaluationChecklistRow) []core.Row {
	tableRows := make([][]string, 0, len(rows))
	for _, item := range rows {
		yes := ""
		if item.Yes {
			yes = monitoringCheckMark
		}
		no := ""
		if item.NoChecked {
			no = monitoringCheckMark
		}
		tableRows = append(tableRows, []string{item.No, item.Item, yes, no, item.Condition, firstNonEmpty(item.Description, item.Analysis)})
	}
	return buildMonitoringTableRows(headers, tableRows, []uint{1, 3, 1, 1, 2, 4}, nil, map[int]bool{1: true, 4: true, 5: true})
}

func buildMonitoringMitigationTableRows(rows [][]string, summaries []entity.MonitoringEvaluationMitigationSummaryRow) []core.Row {
	result := []core.Row{
		monitoringTableRow([]monitoringCell{
			{text: "No", width: 1, bold: true, align: align.Center},
			{text: "Uraian", width: 2, bold: true, align: align.Center},
			{text: "Jml Risiko", width: 1, bold: true, align: align.Center},
			{text: "Jml Rencana Mitigasi", width: 2, bold: true, align: align.Center},
			{text: "Jml Realisasi Mitigasi", width: 2, bold: true, align: align.Center},
			{text: "Hasil", width: 4, bold: true, align: align.Center},
		}, nil),
		monitoringTableRow([]monitoringCell{
			{text: "", width: 1, bold: true, align: align.Center},
			{text: "", width: 2, bold: true, align: align.Center},
			{text: "", width: 1, bold: true, align: align.Center},
			{text: "", width: 2, bold: true, align: align.Center},
			{text: "", width: 2, bold: true, align: align.Center},
			{text: "Jml Risiko Turun", width: 1, bold: true, align: align.Center},
			{text: "Jml Risiko Menetap", width: 1, bold: true, align: align.Center},
			{text: "Jml Risiko Naik", width: 1, bold: true, align: align.Center},
			{text: "Jml Risiko Baru", width: 1, bold: true, align: align.Center},
		}, nil),
	}
	for idx, rowData := range rows {
		var bg *props.Color
		if idx < len(summaries) && summaries[idx].Total {
			bg = &props.Color{Red: 217, Green: 217, Blue: 217}
		}
		result = append(result, monitoringTableRow([]monitoringCell{
			{text: rowData[0], width: 1, align: align.Center},
			{text: rowData[1], width: 2, align: align.Left},
			{text: rowData[2], width: 1, align: align.Center},
			{text: rowData[3], width: 2, align: align.Center},
			{text: rowData[4], width: 2, align: align.Center},
			{text: rowData[5], width: 1, align: align.Center},
			{text: rowData[6], width: 1, align: align.Center},
			{text: rowData[7], width: 1, align: align.Center},
			{text: rowData[8], width: 1, align: align.Center},
		}, bg))
	}
	return result
}

func buildMonitoringTableRows(headers []string, rows [][]string, widths []uint, totalRows map[int]bool, leftAligned map[int]bool) []core.Row {
	propWidths := normalizeWidths(widths)
	result := make([]core.Row, 0, len(rows)+1)

	headerCells := make([]monitoringCell, 0, len(headers))
	for i, header := range headers {
		headerCells = append(headerCells, monitoringCell{text: header, width: propWidths[i], bold: true, align: align.Center})
	}
	result = append(result, monitoringTableRow(headerCells, nil))

	for rowIndex, rowData := range rows {
		var bg *props.Color
		if totalRows != nil && totalRows[rowIndex] {
			bg = &props.Color{Red: 217, Green: 217, Blue: 217}
		}
		cells := make([]monitoringCell, 0, len(rowData))
		for i, value := range rowData {
			cellAlign := align.Center
			if leftAligned[i] {
				cellAlign = align.Left
			}
			cell := monitoringCell{text: value, width: propWidths[i], align: cellAlign}
			if i == 5 {
				cell.breakLine = breakline.DashStrategy
			}
			if (i == 2 || i == 3) && value == monitoringCheckMark {
				cell.symbol = true
			}
			cells = append(cells, cell)
		}
		result = append(result, monitoringTableRow(cells, bg))
	}
	return result
}

func addMonitoringCenteredText(m core.Maroto, value string, size float64, bold bool) {
	style := fontstyle.Normal
	if bold {
		style = fontstyle.Bold
	}
	rowItem := row.New(size*0.55 + 2)
	rowItem.Add(col.New(gridSize).Add(text.New(value, props.Text{
		Size:   size,
		Align:  align.Center,
		Style:  style,
		Family: fontfamily.Arial,
		Color:  BlackColor,
	})))
	m.AddRows(rowItem)
}

func addMonitoringParagraph(m core.Maroto, value string) {
	addMonitoringIndentedParagraph(m, value, monitoringTextIndent)
}

func addMonitoringIndentedParagraph(m core.Maroto, value string, indent float64) {
	if strings.TrimSpace(value) == "" {
		m.AddRows(row.New(5))
		return
	}
	m.AddRows(text.NewAutoRow(value, props.Text{
		Size:              monitoringBodyFontSize,
		Align:             align.Left,
		Family:            fontfamily.Arial,
		Color:             BlackColor,
		Left:              indent,
		Right:             monitoringTextIndent,
		VerticalPadding:   1.2,
		BreakLineStrategy: breakline.EmptySpaceStrategy,
	}))
	m.AddRows(row.New(1.8))
}

func addMonitoringPair(m core.Maroto, label, value string) {
	rowItem := row.New(8)
	rowItem.Add(col.New(2).Add(text.New(label, props.Text{
		Size:   monitoringBodyFontSize,
		Align:  align.Left,
		Family: fontfamily.Arial,
		Color:  BlackColor,
		Left:   monitoringTextIndent,
	})))
	rowItem.Add(col.New(1).Add(text.New(":", props.Text{
		Size:   monitoringBodyFontSize,
		Align:  align.Center,
		Family: fontfamily.Arial,
		Color:  BlackColor,
	})))
	rowItem.Add(col.New(9).Add(text.New(value, props.Text{
		Size:   monitoringBodyFontSize,
		Align:  align.Left,
		Family: fontfamily.Arial,
		Color:  BlackColor,
	})))
	m.AddRows(rowItem)
}

func addMonitoringNumberedSection(m core.Maroto, number, title string, items []string) {
	addMonitoringParagraph(m, number+" "+title)
	for idx, item := range items {
		addMonitoringParagraph(m, fmt.Sprintf("%c. %s", 'a'+idx, item))
	}
}

func monitoringFooterRows() []core.Row {
	return []core.Row{
		text.NewRow(4.2, "Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik", props.Text{
			Size:   8,
			Align:  align.Center,
			Family: fontfamily.Arial,
			Color:  BlackColor,
		}),
		text.NewRow(4.2, "yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).", props.Text{
			Size:   8,
			Align:  align.Center,
			Family: fontfamily.Arial,
			Color:  BlackColor,
		}),
	}
}

type monitoringCell struct {
	text      string
	width     int
	bold      bool
	symbol    bool
	align     align.Type
	breakLine breakline.Strategy
}

func monitoringTableRow(cells []monitoringCell, bg *props.Color) core.Row {
	tableRow := row.New()
	for _, item := range cells {
		style := fontstyle.Normal
		if item.bold {
			style = fontstyle.Bold
		}
		cellAlign := item.align
		if cellAlign == "" {
			cellAlign = align.Center
		}
		breakStrategy := item.breakLine
		if breakStrategy == "" {
			breakStrategy = breakline.EmptySpaceStrategy
		}
		family := fontfamily.Arial
		size := monitoringTableFontSize
		if item.symbol {
			family = fontfamily.ZapBats
			size = monitoringBodyFontSize
		}
		cell := col.New(item.width)
		cell.Add(text.New(item.text, props.Text{
			Size:              size,
			Align:             cellAlign,
			Color:             BlackColor,
			Family:            family,
			Style:             style,
			Top:               1.5,
			Bottom:            1.5,
			Left:              2,
			Right:             2,
			VerticalPadding:   1,
			BreakLineStrategy: breakStrategy,
		}))
		cell.WithStyle(monitoringCellBorder(bg))
		tableRow.Add(cell)
	}
	return tableRow
}

func monitoringCellBorder(bg *props.Color) *props.Cell {
	return &props.Cell{
		BackgroundColor: bg,
		BorderType:      border.Full,
		BorderColor:     BlackColor,
		BorderThickness: 0.2,
	}
}

func addMonitoringIdentityBox(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	rows := []struct {
		label string
		value string
	}{
		{"Satuan / Unit Kerja", data.OrganizationName},
		{"Tahun Anggaran", data.Year},
		{"Kode", data.UnitCode},
		{"Lokasi", data.UnitLocation},
		{"Unit Eselon I", data.UnitEselonI},
	}
	for idx, item := range rows {
		borderType := border.Left | border.Right
		if idx == 0 {
			borderType |= border.Top
		}
		if idx == len(rows)-1 {
			borderType |= border.Bottom
		}
		rowItem := row.New(5.2)
		rowItem.Add(col.New(2))
		rowItem.Add(monitoringIdentityCol(3, item.label, align.Left, borderType&^border.Right))
		rowItem.Add(monitoringIdentityCol(1, ":", align.Center, borderType&^(border.Left|border.Right)))
		rowItem.Add(monitoringIdentityCol(5, item.value, align.Left, borderType&^border.Left))
		rowItem.Add(col.New(1))
		m.AddRows(rowItem)
	}
}

func monitoringIdentityCol(width int, value string, textAlign align.Type, borderType border.Type) core.Col {
	cell := col.New(width)
	cell.Add(text.New(value, props.Text{
		Size:   9,
		Align:  textAlign,
		Family: fontfamily.Arial,
		Color:  BlackColor,
		Left:   2,
		Right:  2,
	}))
	cell.WithStyle(&props.Cell{
		BorderType:      borderType,
		BorderColor:     BlackColor,
		BorderThickness: 0.2,
	})
	return cell
}

func addMonitoringPageBreak(m core.Maroto) {
	m.AddPages(page.New().Add(row.New(0)))
}

func addMonitoringSignatureBlock(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	leftTitle := "Kepala " + defaultIfEmpty(data.OrganizationName, "")
	leftName := defaultIfEmpty(data.UnitLeaderName, "")
	if leftName == "" {
		leftName = strings.Repeat(" ", 10)
	}
	rows := []struct {
		left  string
		right string
		h     float64
	}{
		{leftTitle, "Ketua SKI,", 6},
		{"", "", 24},
		{leftName, "NIP.", 6},
		{"NIP.", "", 6},
		{"", "Tim Reviu,", 8},
		{"", "", 16},
		{"", "NIP.", 6},
	}
	for _, item := range rows {
		rowItem := row.New(item.h)
		rowItem.Add(col.New(6).Add(text.New(item.left, props.Text{
			Size:   monitoringBodyFontSize,
			Align:  align.Left,
			Family: fontfamily.Arial,
			Color:  BlackColor,
			Left:   monitoringTextIndent,
		})))
		rowItem.Add(col.New(6).Add(text.New(item.right, props.Text{
			Size:   monitoringBodyFontSize,
			Align:  align.Left,
			Family: fontfamily.Arial,
			Color:  BlackColor,
			Left:   monitoringTextIndent,
		})))
		m.AddRows(rowItem)
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
