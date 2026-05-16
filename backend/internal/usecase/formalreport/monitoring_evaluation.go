package formalreport

import (
	"fmt"
	"strings"

	"github.com/manris/backend/internal/domain/entity"
)

var monitoringRiskLevels = []struct {
	key   string
	label string
}{
	{entity.RiskLevelSangatTinggi, "Risiko Sangat Tinggi"},
	{entity.RiskLevelTinggi, "Risiko Tinggi"},
	{entity.RiskLevelSedang, "Risiko Sedang"},
	{entity.RiskLevelRendah, "Risiko Rendah"},
	{entity.RiskLevelSangatRendah, "Risiko Sangat Rendah"},
}

func buildMonitoringEvaluationReportData(
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	risks []*entity.Risk,
) *entity.MonitoringEvaluationReportData {
	period := summary.Cycle
	if period == "" && report != nil {
		period = report.Period
	}

	year, semester := monitoringYearAndSemester(period)
	orgName := ""
	if org != nil {
		orgName = org.Name
	}

	items := compactRisks(risks)
	return &entity.MonitoringEvaluationReportData{
		Report:                  report,
		Organization:            org,
		Summary:                 summary,
		OrganizationName:        orgName,
		Year:                    year,
		SemesterLabel:           semester,
		ReportNumber:            "",
		ReportDate:              "",
		AssignmentLetterNumber:  "",
		AssignmentLetterDate:    "",
		MonitoringDateRange:     "",
		UnitCode:                "",
		UnitLocation:            "",
		UnitAddress:             "",
		UnitEselonI:             "",
		UnitLeaderName:          "",
		DocumentChecklist:       buildMonitoringDocumentChecklist(items),
		InfrastructureChecklist: buildMonitoringInfrastructureChecklist(items),
		ResultChecklist:         buildMonitoringResultChecklist(items),
		MitigationSummary:       buildMonitoringMitigationSummary(items),
	}
}

func monitoringYearAndSemester(period string) (string, string) {
	trimmed := strings.TrimSpace(period)
	if trimmed == "" {
		return "", ""
	}

	parts := strings.FieldsFunc(trimmed, func(r rune) bool {
		return r == '-' || r == '/' || r == ' ' || r == '_'
	})
	year := parts[0]
	semester := ""
	if len(parts) > 1 {
		switch strings.ToUpper(parts[1]) {
		case "H1", "1", "I":
			semester = "SEMESTER I"
		case "H2", "2", "II":
			semester = "SEMESTER II"
		}
	}
	return year, semester
}

func buildMonitoringDocumentChecklist(risks []*entity.Risk) []entity.MonitoringEvaluationChecklistRow {
	mitigationCount := countMonitoringMitigations(risks)
	riskCount := len(risks)
	return []entity.MonitoringEvaluationChecklistRow{
		{No: "1", Item: "Kebijakan yang mendasari penerapan manajemen risiko"},
		{No: "2", Item: "SK tim Penyelenggara Manajemen Risiko"},
		{No: "3", Item: "RAP untuk UPR-T.I, RAK/RSB untuk UPR-T.II"},
		{No: "4", Item: "RKT untuk UPT, Renja K untuk Eselon II dan I (Awal dan Revisi)"},
		{No: "5", Item: "Proses Bisnis / Strategi Maps"},
		{
			No:          "6",
			Item:        "Profil Risiko UPR-T.I/UPR-T.II",
			Yes:         riskCount > 0,
			Condition:   countCondition("Jumlah", riskCount),
			Description: "",
		},
		{No: "7", Item: "Dokumen pengkomunikasian risiko kepada pihak terkait (contoh: pegawai, stakeholder dll)"},
		{
			No:          "8",
			Item:        "Dokumen Rencana Pengendalian/mitigasi dan bukti pelaksanaan",
			Yes:         mitigationCount > 0,
			Condition:   countCondition("Jumlah", mitigationCount),
			Description: "",
		},
		{
			No:          "9",
			Item:        "Laporan Pelaksanaan Manajemen Risiko (Berkala)",
			Yes:         riskCount > 0,
			Condition:   countCondition("Jumlah", riskCount),
			Description: "",
		},
	}
}

func buildMonitoringInfrastructureChecklist(risks []*entity.Risk) []entity.MonitoringEvaluationChecklistRow {
	riskCount := len(risks)
	mitigationCount := countMonitoringMitigations(risks)
	return []entity.MonitoringEvaluationChecklistRow{
		{No: "1.a.1", Item: "Pemahaman pimpinan sebagai role model dan pemahaman pemilik risiko"},
		{No: "1.a.2", Item: "Menggunakan informasi terkait risiko dalam pengambilan keputusan"},
		{No: "1.a.3", Item: "Pimpinan mendorong penerapan MR dan budaya sadar risiko"},
		{No: "1.b.1", Item: "MR dikelola oleh pegawai yang berkompeten"},
		{No: "1.b.2", Item: "Pegawai mendapatkan kesempatan peningkatan kapasitas SDM dalam MR"},
		{No: "1.b.3", Item: "Memiliki program pelatihan/sertifikasi terkait MR"},
		{No: "1.c", Item: "Kemitraan telah mengidentifikasi, menilai dan mengelola risiko terkait seluruh kemitraan"},
		{No: "1.d", Item: "Proses manajemen risiko telah terintegrasi dengan proses bisnis utama unit kerja"},
		{No: "2.a", Item: "Identifikasi kelemahan lingkungan pengendalian", Yes: riskCount > 0},
		{No: "2.b", Item: "Penilaian Risiko telah dilakukan", Yes: riskCount > 0},
		{No: "2.c", Item: "Rencana mitigasi risiko telah ditetapkan dan dilaksanakan", Yes: mitigationCount > 0},
		{No: "2.d", Item: "Pemantauan berkala pelaksanaan mitigasi telah dilakukan", Yes: riskCount > 0},
		{No: "2.e", Item: "Laporan pemantauan berkala dan laporan akhir pelaksanaan manajemen risiko telah disusun", Yes: riskCount > 0},
	}
}

func buildMonitoringResultChecklist(risks []*entity.Risk) []entity.MonitoringEvaluationChecklistRow {
	mitigationCount := countMonitoringMitigations(risks)
	return []entity.MonitoringEvaluationChecklistRow{
		{No: "1.a", Item: "Aktivitas mitigasi risiko telah dijalankan atau direalisasikan sesuai dengan rencana", Yes: mitigationCount > 0},
		{No: "1.b", Item: "Terjadi kejadian risiko pasca penerapan mitigasi"},
		{No: "1.c", Item: "Aktivitas mitigasi berhasil menurunkan level risiko di bawah garis toleransi risiko", Yes: hasMonitoringDecrease(risks)},
		{No: "2", Item: "Tujuan organisasi dan target kinerja organisasi tercapai"},
	}
}

func buildMonitoringMitigationSummary(risks []*entity.Risk) []entity.MonitoringEvaluationMitigationSummaryRow {
	compact := compactRisks(risks)
	rows := make([]entity.MonitoringEvaluationMitigationSummaryRow, 0, len(monitoringRiskLevels)+1)
	total := entity.MonitoringEvaluationMitigationSummaryRow{LevelLabel: "Jumlah", Total: true}

	for idx, level := range monitoringRiskLevels {
		row := entity.MonitoringEvaluationMitigationSummaryRow{
			No:         fmt.Sprintf("%d", idx+1),
			LevelKey:   level.key,
			LevelLabel: level.label,
		}
		for _, risk := range compact {
			if risk == nil || risk.GetRiskLevel() != level.key {
				continue
			}
			row.RiskCount++
			row.MitigationPlanCount += len(risk.Mitigations)
			row.MitigationRealizationCount += len(risk.Mitigations)
			switch monitoringMovement(risk) {
			case "down":
				row.DownCount++
			case "up":
				row.UpCount++
			case "new":
				row.NewCount++
			default:
				row.SameCount++
			}
		}

		total.RiskCount += row.RiskCount
		total.MitigationPlanCount += row.MitigationPlanCount
		total.MitigationRealizationCount += row.MitigationRealizationCount
		total.DownCount += row.DownCount
		total.SameCount += row.SameCount
		total.UpCount += row.UpCount
		total.NewCount += row.NewCount

		rows = append(rows, row)
	}

	rows = append(rows, total)
	return rows
}

func monitoringMovement(risk *entity.Risk) string {
	if risk == nil || risk.BeforeMonitoringNilai == nil {
		return "new"
	}
	if risk.MonitoringResultNilai == nil {
		return "same"
	}
	switch {
	case *risk.BeforeMonitoringNilai > *risk.MonitoringResultNilai:
		return "down"
	case *risk.BeforeMonitoringNilai < *risk.MonitoringResultNilai:
		return "up"
	default:
		return "same"
	}
}

func countMonitoringMitigations(risks []*entity.Risk) int {
	total := 0
	for _, risk := range compactRisks(risks) {
		if risk == nil {
			continue
		}
		total += len(risk.Mitigations)
	}
	return total
}

func hasMonitoringDecrease(risks []*entity.Risk) bool {
	for _, risk := range compactRisks(risks) {
		if monitoringMovement(risk) == "down" {
			return true
		}
	}
	return false
}

func countCondition(label string, count int) string {
	if count == 0 {
		return ""
	}
	return fmt.Sprintf("%s: %d", label, count)
}
