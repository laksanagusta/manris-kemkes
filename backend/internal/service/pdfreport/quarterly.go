package pdfreport

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/orientation"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/timeutil"
)

type quarterlyReportPDFRenderer struct{}

func NewQuarterlyReportPDFRenderer() service.QuarterlyReportPDFRenderer {
	return &quarterlyReportPDFRenderer{}
}

func (r *quarterlyReportPDFRenderer) RenderQuarterly(ctx context.Context, data *entity.QuarterlyReportData) ([]byte, error) {
	if data == nil {
		return nil, fmt.Errorf("quarterly report data is required")
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	m := maroto.New(config.NewBuilder().WithPageSize(pagesize.A4).
		WithOrientation(orientation.Horizontal).WithLeftMargin(12).WithRightMargin(12).
		WithTopMargin(12).WithBottomMargin(16).
		WithDefaultFont(&props.Font{Family: fontfamily.Arial, Size: 9}).Build())
	_ = m.RegisterFooter(row.New(8).Add(col.New(12).Add(text.New("Manris - Laporan evaluasi kuartal | Salinan data saat ekspor", props.Text{Size: 8, Color: MutedText}))))
	summary := service.SummarizeQuarterlyReport(data)
	prior := service.SummarizeQuarterlyReport(&entity.QuarterlyReportData{Cycle: data.ComparisonCycle, GeneratedAt: data.GeneratedAt, Risks: data.PreviousRisks, Tasks: data.PreviousTasks})
	quarterlyText(m, "Laporan evaluasi kuartal - "+data.Cycle, true)
	quarterlyText(m, "Pembanding: "+data.ComparisonCycle+" | Dibuat: "+quarterlyDate(data.GeneratedAt), false)
	updated := "Belum ada data"
	if data.DataUpdatedAt != nil {
		updated = quarterlyDate(*data.DataUpdatedAt)
	}
	quarterlyText(m, "Data terakhir diperbarui: "+updated, false)
	orgNames := make([]string, 0, len(data.Organizations))
	for _, org := range data.Organizations {
		orgNames = append(orgNames, org.Name)
	}
	quarterlyText(m, "Scope organisasi: "+strings.Join(orgNames, "; "), false)
	for _, warning := range data.Warnings {
		quarterlyText(m, "Keterbatasan data: "+warning, false)
	}

	quarterlyText(m, "Ringkasan kinerja", true)
	quarterlyTable(m, []string{"Indikator", "Periode laporan", "Pembanding", "Dasar perhitungan"}, [][]string{
		{"Risiko di atas selera risiko", quarterlyRatio(summary.AboveAppetite, summary.TotalRisks), quarterlyRatio(prior.AboveAppetite, prior.TotalRisks), "Nilai profil dibulatkan >= 10"},
		{"Target tercapai", quarterlyRatio(summary.TargetReached, summary.TargetAssessable), quarterlyRatio(prior.TargetReached, prior.TargetAssessable), fmt.Sprintf("Target valid + observasi final; %d belum dapat dinilai", summary.TargetUnassessable)},
		{"Mitigasi terlapor", quarterlyRatio(summary.Tasks.Reported, summary.Tasks.Total), quarterlyRatio(prior.Tasks.Reported, prior.Tasks.Total), "Seluruh tugas periode; done + waktu laporan + catatan valid"},
		{"Pemantauan final", quarterlyRatio(summary.FinalMonitoring, summary.TotalRisks), quarterlyRatio(prior.FinalMonitoring, prior.TotalRisks), "Observasi final pada kuartal laporan"},
	}, []uint{3, 2, 2, 5})
	quarterlyText(m, fmt.Sprintf("Cakupan: %d/%d target tersedia; %d/%d observasi final; %d/%d laporan mitigasi valid. Penyebut nol ditampilkan sebagai tanda pisah.", summary.TargetsAvailable, summary.TotalRisks, summary.FinalMonitoring, summary.TotalRisks, summary.Tasks.Reported, summary.Tasks.Total), false)

	quarterlyText(m, "Perubahan risiko dan pencapaian target", true)
	quarterlyTable(m, []string{"Baru", "Memburuk", "Membaik", "Tetap", "Tidak aktif di periode ini"}, [][]string{{
		fmt.Sprint(summary.Movement.New), fmt.Sprint(summary.Movement.Worsened), fmt.Sprint(summary.Movement.Improved), fmt.Sprint(summary.Movement.Stable), fmt.Sprint(summary.Movement.Inactive),
	}}, []uint{2, 2, 2, 2, 4})
	quarterlyTable(m, []string{"Target tercapai", "Belum tercapai", "Belum dapat dinilai"}, [][]string{{fmt.Sprint(summary.TargetReached), fmt.Sprint(summary.TargetAssessable - summary.TargetReached), fmt.Sprint(summary.TargetUnassessable)}}, []uint{4, 4, 4})
	quarterlyText(m, "Perubahan membandingkan nilai profil pada kedua periode. Risiko baru memiliki kategori tersendiri. Pengarsipan bukan penurunan skor. Target berasal dari profil yang berlaku; pencapaian membandingkan nilai observasi final dengan target, tanpa menyatakan kegagalan tenggat.", false)

	quarterlyText(m, "Pelaksanaan dan pelaporan mitigasi", true)
	quarterlyTable(m, []string{"Terlapor", "Belum terlapor", "Melewati tenggat", "Tidak dilaporkan", "Dilewati"}, [][]string{{fmt.Sprint(summary.Tasks.Reported), fmt.Sprint(summary.Tasks.Pending), fmt.Sprint(summary.Tasks.Overdue), fmt.Sprint(summary.Tasks.NotReported), fmt.Sprint(summary.Tasks.Skipped)}}, []uint{2, 2, 3, 3, 2})
	quarterlyText(m, fmt.Sprintf("%d laporan memiliki waktu pengiriman/pembaruan setelah tanggal tenggat. Timestamp ini bukan bukti tanggal penyelesaian tindakan atau tanggal pengiriman pertama. Tugas dilewati tetap termasuk jumlah tugas periode. Pencapaian target risiko dan laporan mitigasi tidak membuktikan hubungan sebab akibat.", summary.Tasks.LateReports), false)

	quarterlyText(m, "Kejadian dan dampak aktual", true)
	knownLoss := "-"
	if summary.Events.KnownLossCount > 0 {
		knownLoss = fmt.Sprintf("Rp %.2f", summary.Events.KnownLoss)
	}
	quarterlyText(m, fmt.Sprintf("%d kejadian; %d belum terhubung ke register dalam scope. Kerugian diketahui: %s; %d kejadian memiliki kerugian belum diketahui. Atribusi berdasarkan tanggal kejadian, dengan deduplikasi ID kejadian.", summary.Events.Total, summary.Events.Unlinked, knownLoss, summary.Events.UnknownLoss), false)
	quarterlyText(m, "Keparahan: "+quarterlyCounts(summary.Events.Severity)+". Kondisi pascarespons: "+quarterlyCounts(summary.Events.Condition)+".", false)
	eventRows := [][]string{}
	seenEvents := map[uuid.UUID]bool{}
	for _, e := range data.Events {
		if e == nil || seenEvents[e.ID] {
			continue
		}
		seenEvents[e.ID] = true
		loss := "Belum diketahui"
		if e.FinancialLossKnown != nil && *e.FinancialLossKnown && e.FinancialLoss != nil && *e.FinancialLoss >= 0 {
			loss = fmt.Sprintf("Rp %.2f", *e.FinancialLoss)
		}
		linked := []string{}
		for _, risk := range e.LinkedRisks {
			linked = append(linked, risk.Code)
		}
		if len(linked) == 0 {
			label := "Belum terhubung"
			if e.HasLinkedRisks != nil && *e.HasLinkedRisks {
				label = "Detail risiko terkait dibatasi akses"
			}
			linked = []string{label}
		}
		eventRows = append(eventRows, []string{e.Code + " | " + quarterlyDate(e.OccurredAt), e.Description + " | Dampak: " + e.ActualImpact, e.Severity + " | " + e.PostResponseCondition, e.OrganizationName, loss, strings.Join(linked, ", ")})
	}
	quarterlyTable(m, []string{"Kejadian / tanggal", "Kejadian dan dampak", "Keparahan / kondisi", "Unit", "Kerugian", "Risiko terkait"}, eventRows, []uint{2, 4, 2, 2, 1, 1})

	quarterlyText(m, "Perbandingan unit", true)
	unitRows := [][]string{}
	for _, org := range data.Organizations {
		u := quarterlyUnitData(data, org.ID)
		s := service.SummarizeQuarterlyReport(u)
		if s.TotalRisks+s.Tasks.Total+s.Events.Total == 0 {
			unitRows = append(unitRows, []string{org.Name + " | Belum ada data", "-", "-", "-", "-", "-"})
			continue
		}
		unitRows = append(unitRows, []string{org.Name, quarterlyRatio(s.AboveAppetite, s.TotalRisks), quarterlyRatio(s.TargetReached, s.TargetAssessable) + fmt.Sprintf("; %d belum dinilai", s.TargetUnassessable), quarterlyRatio(s.Tasks.Reported, s.Tasks.Total), quarterlyRatio(s.FinalMonitoring, s.TotalRisks), fmt.Sprintf("%d kejadian; %d terlambat", s.Events.Total, s.Tasks.Overdue)})
	}
	quarterlyTable(m, []string{"Unit", "Di atas selera", "Target tercapai", "Mitigasi terlapor", "Pemantauan final", "Tindak lanjut"}, unitRows, []uint{3, 2, 2, 2, 2, 1})

	quarterlyText(m, "Risiko yang membutuhkan perhatian", true)
	attention, all := quarterlyRiskRows(data)
	quarterlyTable(m, []string{"Risiko / unit", "Nilai profil", "Observasi / target", "Perubahan", "Perhatian / lifecycle"}, attention, []uint{4, 1, 2, 1, 4})
	quarterlyText(m, "Daftar seluruh risiko periode", true)
	quarterlyTable(m, []string{"Risiko / unit", "Nilai profil", "Observasi / target", "Perubahan", "Perhatian / lifecycle"}, all, []uint{4, 1, 2, 1, 4})
	quarterlyText(m, "Rincian tugas mitigasi periode", true)
	taskRows := [][]string{}
	for _, t := range data.Tasks {
		state := service.QuarterlyTaskReportingStatus(t.MitigationTask, data.Cycle, data.GeneratedAt)
		taskRows = append(taskRows, []string{t.RiskCode + " | " + t.MitigationAction, t.PeriodLabel + " (" + t.PeriodStart + " - " + t.PeriodEnd + ")", t.DueDate, quarterlyStatusLabel(state), t.Notes + " | Output: " + t.ReportOutput + " | Kendala: " + t.ReportObstacle})
	}
	quarterlyTable(m, []string{"Risiko / tindakan", "Periode tugas", "Tenggat laporan", "Status pelaporan", "Catatan laporan"}, taskRows, []uint{3, 2, 1, 2, 4})
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	doc, err := m.Generate()
	if err != nil {
		return nil, err
	}
	return doc.GetBytes(), nil
}

func quarterlyRatio(numerator, denominator int) string {
	if denominator == 0 {
		return "-"
	}
	return fmt.Sprintf("%.1f%% (%d/%d)", float64(numerator)/float64(denominator)*100, numerator, denominator)
}

func quarterlyDate(value time.Time) string {
	return value.In(timeutil.JakartaLocation()).Format("02 Jan 2006 15:04 WIB")
}

func quarterlyText(m core.Maroto, value string, heading bool) {
	size, style, height := 9.0, fontstyle.Normal, 5.0
	if heading {
		size, style, height = 13, fontstyle.Bold, 9
	}
	// Fit paragraphs and organization lists without truncating their contents.
	height += float64(utf8.RuneCountInString(value)/145) * 5
	m.AddRows(row.New(height).Add(col.New(12).Add(text.New(value, props.Text{Size: size, Style: style, Family: fontfamily.Arial}))))
}

func quarterlyTable(m core.Maroto, headers []string, rows [][]string, widths []uint) {
	if len(rows) == 0 {
		quarterlyText(m, "Belum ada data untuk bagian ini.", false)
		return
	}
	// Repeat headings in bounded chunks; each row expands to its text content.
	for offset := 0; offset < len(rows); offset += 12 {
		limit := offset + 12
		if limit > len(rows) {
			limit = len(rows)
		}
		m.AddRows(RenderTable(headers, nil, widths, WithFontSize(8), WithRowHeight(12))...)
		grid := normalizeWidths(widths)
		for _, values := range rows[offset:limit] {
			height := 10.0
			for i, value := range values {
				chars := grid[i] * 12
				lines := float64((utf8.RuneCountInString(value) + chars - 1) / chars)
				height = math.Max(height, 4+lines*4)
			}
			// Keep exceptionally long report notes in a readable full-width paragraph.
			if height > 100 {
				for i, value := range values {
					quarterlyText(m, headers[i]+": "+value, false)
				}
				continue
			}
			full := RenderTable(headers, [][]string{values}, widths, WithFontSize(8), WithRowHeight(height), WithLeftAligned(0, len(values)-1))
			m.AddRows(full[1:]...)
		}
	}
	m.AddRows(row.New(4))
}

func quarterlyCounts(values map[string]int) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := []string{}
	labels := map[string]string{"low": "Rendah", "medium": "Sedang", "high": "Tinggi", "extreme": "Sangat tinggi", "recovered": "Pulih", "controlled": "Terkendali", "ongoing": "Masih berlangsung", "worsening": "Memburuk", "unknown": "Belum diketahui"}
	for _, key := range keys {
		label := labels[key]
		if label == "" {
			label = key
		}
		parts = append(parts, fmt.Sprintf("%s %d", label, values[key]))
	}
	if len(parts) == 0 {
		return "Belum ada data"
	}
	return strings.Join(parts, "; ")
}

func quarterlyStatusLabel(state string) string {
	return map[string]string{"reported": "Terlapor", "pending": "Belum terlapor", "overdue": "Melewati tenggat", "not_reported": "Tidak dilaporkan", "skipped": "Dilewati"}[state]
}

func quarterlyUnitData(data *entity.QuarterlyReportData, id uuid.UUID) *entity.QuarterlyReportData {
	u := &entity.QuarterlyReportData{Cycle: data.Cycle, GeneratedAt: data.GeneratedAt}
	for _, r := range data.Risks {
		if r.OrganizationID != nil && *r.OrganizationID == id {
			u.Risks = append(u.Risks, r)
		}
	}
	for _, t := range data.Tasks {
		if t.OrganizationID == id {
			u.Tasks = append(u.Tasks, t)
		}
	}
	for _, e := range data.Events {
		if e.OrganizationID == id {
			u.Events = append(u.Events, e)
		}
	}
	return u
}

func quarterlyRiskRows(data *entity.QuarterlyReportData) ([][]string, [][]string) {
	previous := map[uuid.UUID]*entity.Risk{}
	for _, r := range data.PreviousRisks {
		previous[r.VersionGroupID] = r.Risk
	}
	attention, all := [][]string{}, [][]string{}
	for _, r := range data.Risks {
		movement := "Baru"
		issues := []string{}
		if before := previous[r.VersionGroupID]; before != nil {
			change := math.Round(service.QuarterlyProfileNilai(r.Risk)) - math.Round(service.QuarterlyProfileNilai(before))
			if service.QuarterlyProfileNilai(r.Risk) <= 0 || service.QuarterlyProfileNilai(before) <= 0 {
				change = 0
			}
			if change > 0 {
				movement = "Memburuk"
				issues = append(issues, "Risiko memburuk")
			} else if change < 0 {
				movement = "Membaik"
			} else {
				movement = "Tetap"
			}
		}
		observed, final := service.QuarterlyFinalObservation(r.Risk, data.Cycle)
		target, valid := service.QuarterlyTargetNilai(r.Risk)
		observedText, targetText := "-", "-"
		if final {
			observedText = fmt.Sprintf("%.2f", observed)
		} else {
			issues = append(issues, "Pemantauan belum final")
		}
		if valid {
			targetText = fmt.Sprintf("%.2f", target)
		}
		if final && valid && observed > target {
			issues = append(issues, "Belum mencapai target")
		}
		for _, t := range data.Tasks {
			if (t.VersionGroupID == r.VersionGroupID || t.RiskID == r.ID) && service.QuarterlyTaskReportingStatus(t.MitigationTask, data.Cycle, data.GeneratedAt) == "overdue" {
				issues = append(issues, "Laporan mitigasi melewati tenggat")
				break
			}
		}
		hasAttention := len(issues) > 0
		if r.ArchivedInPeriod {
			issues = append(issues, "Diarsipkan dalam periode ini")
		}
		values := []string{r.Code + " | " + r.Title + " | " + r.OrgName, fmt.Sprintf("%.2f", service.QuarterlyProfileNilai(r.Risk)), observedText + " / " + targetText, movement, strings.Join(issues, "; ")}
		all = append(all, values)
		if hasAttention {
			attention = append(attention, values)
		}
	}
	return attention, all
}
