package pdfreport

import (
	"bytes"
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestQuarterlyPDFRendersEmptyUnitsAndCompleteAnalysis(t *testing.T) {
	data := &entity.QuarterlyReportData{Cycle: "2026-Q2", ComparisonCycle: "2026-Q1", GeneratedAt: time.Now(), Organizations: []entity.QuarterlyReportOrganization{{ID: uuid.New(), Name: "Unit tanpa data"}}, Warnings: []string{"Riwayat pemulihan terbatas"}}
	content, err := NewQuarterlyReportPDFRenderer().RenderQuarterly(context.Background(), data)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(content, []byte("%PDF")) || len(content) < 1000 {
		t.Fatal("expected a complete PDF document")
	}
	if quarterlyRatio(0, 0) != "-" || quarterlyRatio(2, 2) != "100.0% (2/2)" {
		t.Fatal("export must preserve undefined ratios and assessable denominator")
	}
}

func TestQuarterlyPDFPopulatedAnalysisAndLongReports(t *testing.T) {
	orgID, emptyOrg, group := uuid.New(), uuid.New(), uuid.New()
	cycle, status, observed := "2026-Q2", "final", 12.0
	reported := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	risk := &entity.Risk{ID: uuid.New(), VersionGroupID: group, Code: "R-001", Title: "Keterlambatan distribusi persediaan untuk layanan kesehatan daerah", OrganizationID: &orgID, OrgName: "Direktorat layanan", Nilai: 19, TargetProbability: 2, TargetImpact: 2, TargetWeight: 1.8, TargetNilai: 7.2, MonitoringStatus: &status, MonitoringAssessmentCycle: &cycle, MonitoringObservedNilai: &observed}
	prior := *risk
	prior.Nilai = 15
	loss, known := 200000.0, true
	data := &entity.QuarterlyReportData{Cycle: cycle, ComparisonCycle: "2026-Q1", GeneratedAt: time.Now(), Organizations: []entity.QuarterlyReportOrganization{{ID: orgID, Name: risk.OrgName}, {ID: emptyOrg, Name: "Unit tanpa data"}}, Risks: []*entity.QuarterlyReportRisk{{Risk: risk, ArchivedInPeriod: true}}, PreviousRisks: []*entity.QuarterlyReportRisk{{Risk: &prior}}, Tasks: []*entity.QuarterlyReportTask{{MitigationTask: &entity.MitigationTask{RiskID: risk.ID, RiskCode: risk.Code, PeriodLabel: cycle, PeriodStart: "2026-04-01", PeriodEnd: "2026-06-30", DueDate: "2026-05-31", Status: "done", Notes: strings.Repeat("Pelaksanaan kegiatan dilaporkan beserta bukti dan kendala. ", 12), ReportedAt: &reported, MitigationAction: "Koordinasi lintas wilayah"}, OrganizationID: orgID, VersionGroupID: group}}, Events: []*entity.RiskEvent{{ID: uuid.New(), Code: "KJR-001", OccurredAt: time.Now(), Description: "Persediaan tiba setelah jadwal", ActualImpact: "Layanan tertunda dua hari", Severity: "high", PostResponseCondition: "controlled", OrganizationID: orgID, OrganizationName: risk.OrgName, FinancialLoss: &loss, FinancialLossKnown: &known}}}
	content, err := NewQuarterlyReportPDFRenderer().RenderQuarterly(context.Background(), data)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(content, []byte("%PDF")) {
		t.Fatal("populated quarterly export must render")
	}
	if output := os.Getenv("QUARTERLY_PDF_TEST_OUTPUT"); output != "" {
		if err := os.WriteFile(output, content, 0600); err != nil {
			t.Fatal(err)
		}
	}
}
