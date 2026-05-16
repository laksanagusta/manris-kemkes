package formalreport

import (
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestBuildMonitoringMitigationSummary(t *testing.T) {
	beforeHigh := 18.0
	afterMedium := 12.0
	beforeSame := 11.0
	afterSame := 11.0
	beforeUp := 7.0
	afterUp := 15.0

	risks := []*entity.Risk{
		{
			Code: "R-1", Title: "Turun", Probability: 4, Impact: 5, Weight: 1, Nilai: 20,
			BeforeMonitoringNilai: &beforeHigh, MonitoringResultNilai: &afterMedium,
			Mitigations: []entity.Mitigation{{Action: "Mitigasi A"}},
		},
		{
			Code: "R-2", Title: "Menetap", Probability: 3, Impact: 4, Weight: 1, Nilai: 12,
			BeforeMonitoringNilai: &beforeSame, MonitoringResultNilai: &afterSame,
			Mitigations: []entity.Mitigation{{Action: "Mitigasi B"}, {Action: "Mitigasi C"}},
		},
		{
			Code: "R-3", Title: "Naik", Probability: 2, Impact: 3, Weight: 1, Nilai: 6,
			BeforeMonitoringNilai: &beforeUp, MonitoringResultNilai: &afterUp,
		},
		{
			Code: "R-4", Title: "Baru", Probability: 5, Impact: 5, Weight: 1, Nilai: 25,
		},
	}

	rows := buildMonitoringMitigationSummary(risks)
	if got, want := len(rows), 6; got != want {
		t.Fatalf("rows len = %d, want %d", got, want)
	}

	total := rows[len(rows)-1]
	if !total.Total {
		t.Fatal("expected final row to be total")
	}
	if total.RiskCount != 4 {
		t.Fatalf("total risk count = %d, want 4", total.RiskCount)
	}
	if total.MitigationPlanCount != 3 {
		t.Fatalf("mitigation plan count = %d, want 3", total.MitigationPlanCount)
	}
	if total.MitigationRealizationCount != 3 {
		t.Fatalf("mitigation realization count = %d, want 3", total.MitigationRealizationCount)
	}
	if total.DownCount != 1 || total.SameCount != 1 || total.UpCount != 1 || total.NewCount != 1 {
		t.Fatalf("movement totals = down:%d same:%d up:%d new:%d, want 1/1/1/1", total.DownCount, total.SameCount, total.UpCount, total.NewCount)
	}
}

func TestBuildMonitoringEvaluationReportDataUsesBlankMetadata(t *testing.T) {
	report := &entity.FormalReport{Period: "2025-H2", ReportType: entity.FormalReportTypeMonitoringEvaluation}
	org := &entity.Organization{Name: "Balai Contoh"}
	data := buildMonitoringEvaluationReportData(report, org, entity.ReportSummary{Cycle: "2025-H2"}, nil)

	if data == nil {
		t.Fatal("expected monitoring evaluation payload")
	}
	if data.OrganizationName != "Balai Contoh" {
		t.Fatalf("organization name = %q, want Balai Contoh", data.OrganizationName)
	}
	if data.SemesterLabel != "SEMESTER II" {
		t.Fatalf("semester label = %q, want SEMESTER II", data.SemesterLabel)
	}
	if data.Year != "2025" {
		t.Fatalf("year = %q, want 2025", data.Year)
	}
	if data.ReportNumber != "" || data.AssignmentLetterNumber != "" || data.UnitCode != "" {
		t.Fatalf("expected unavailable metadata to stay blank: %#v", data)
	}
	if len(data.DocumentChecklist) != 9 {
		t.Fatalf("document checklist rows = %d, want 9", len(data.DocumentChecklist))
	}
	if len(data.InfrastructureChecklist) != 13 {
		t.Fatalf("infrastructure checklist rows = %d, want 13", len(data.InfrastructureChecklist))
	}
	if len(data.ResultChecklist) != 4 {
		t.Fatalf("result checklist rows = %d, want 4", len(data.ResultChecklist))
	}
}
