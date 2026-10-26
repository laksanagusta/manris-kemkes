package report

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func analysisFixture() (*entity.QuarterlyReportData, uuid.UUID, uuid.UUID, uuid.UUID) {
	a, b, foreign := uuid.New(), uuid.New(), uuid.New()
	risk := func(org uuid.UUID, category, title string, value float64) *entity.QuarterlyReportRisk {
		return &entity.QuarterlyReportRisk{Risk: &entity.Risk{ID: uuid.New(), OrganizationID: &org, OrgName: "Unit " + org.String(), Category: category, Title: title, Nilai: value}}
	}
	observed := 1.0
	first := risk(a, "operasional", "Delta layanan", 14.5)
	first.MonitoringObservedNilai = &observed
	weighted := risk(a, "operasional", "Profil berbobot", 0)
	weighted.Probability, weighted.Impact, weighted.Weight = 2, 3, 2.4
	legacy := risk(a, "reputasi", "Profil kompatibilitas", 0)
	legacy.InherentScore = 20
	data := &entity.QuarterlyReportData{Cycle: "2026-Q4", ComparisonCycle: "2026-Q3", GeneratedAt: time.Date(2026, 10, 24, 0, 0, 0, 0, time.UTC), SnapshotHash: "canonical-snapshot", Organizations: []entity.QuarterlyReportOrganization{{ID: a, Name: "Unit A"}, {ID: b, Name: "Unit B"}, {ID: foreign, Name: "Unit asing"}}, Risks: []*entity.QuarterlyReportRisk{first, risk(b, "kebijakan", "Kebijakan", 9.5), weighted, legacy, risk(b, "operasional", "Nilai tidak diketahui", 0), risk(foreign, "legal", "Rahasia unit asing", 25), nil}, PreviousRisks: []*entity.QuarterlyReportRisk{risk(a, "operasional", "Delta sebelumnya", 19.6), risk(b, "kebijakan", "Kebijakan sebelumnya", 4), risk(foreign, "legal", "Rahasia sebelumnya", 25)}}
	return data, a, b, foreign
}

func TestAgentAnalysisUsesCanonicalProfileAndDistinguishesUnavailable(t *testing.T) {
	data, a, b, _ := analysisFixture()
	for _, tc := range []struct {
		name     string
		metric   AnalysisMetric
		count    int
		complete bool
	}{
		{"all profiles", AnalysisRisks, 5, true},
		{"rounded high profile", AnalysisHighRisks, 2, false},
		{"rounded appetite", AnalysisAboveAppetite, 4, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result, err := AnalyzeQuarterlyReport(data, AnalysisInput{OrganizationIDs: []uuid.UUID{a, b}, GroupBy: AnalysisByOrganization, Metric: tc.metric})
			if err != nil {
				t.Fatal(err)
			}
			if result.Current.Count != tc.count || result.Current.Population != 5 || result.Current.Unavailable != 1 || result.Current.Complete != tc.complete || result.UnknownScores != 1 {
				t.Fatalf("incorrect profile semantics: %+v", result.Current)
			}
			if result.Previous == nil || result.Previous.Population != 2 || result.SnapshotHash != data.SnapshotHash {
				t.Fatal("canonical comparison/snapshot identity lost")
			}
		})
	}
}

func TestAgentAnalysisCountsFullPopulationBeforeTopGroupsLimit(t *testing.T) {
	data, a, b, _ := analysisFixture()
	result, err := AnalyzeQuarterlyReport(data, AnalysisInput{OrganizationIDs: []uuid.UUID{a, b}, GroupBy: AnalysisByCategory, Metric: AnalysisRisks, Limit: 1})
	if err != nil {
		t.Fatal(err)
	}
	if result.Current.Count != 5 || result.TotalGroups != 3 || result.ReturnedGroups != 1 || !result.RowsTruncated || !result.PopulationComplete || result.Groups[0].Key != "operasional" || result.Groups[0].Current.Count != 3 {
		t.Fatalf("top group was confused with complete population: %+v", result)
	}
	if result.Previous == nil || result.Previous.Count != 2 {
		t.Fatal("top-N altered comparison total")
	}
}

func TestAgentAnalysisAppliesSameRiskFiltersToBothPeriods(t *testing.T) {
	data, a, b, _ := analysisFixture()
	result, err := AnalyzeQuarterlyReport(data, AnalysisInput{OrganizationIDs: []uuid.UUID{a, b}, GroupBy: AnalysisByLevel, Metric: AnalysisRisks, Category: "operasional", Level: "tinggi", Query: " DELTA "})
	if err != nil {
		t.Fatal(err)
	}
	if result.Current.Count != 1 || result.Current.Population != 1 || result.UnknownScores != 0 || result.Groups[0].Key != "tinggi" || result.Previous == nil || result.Previous.Count != 0 || result.Previous.Population != 0 {
		t.Fatalf("filtered population/comparison is wrong: %+v", result)
	}
	unknown, err := AnalyzeQuarterlyReport(data, AnalysisInput{OrganizationIDs: []uuid.UUID{a, b}, GroupBy: AnalysisByLevel, Level: "unavailable"})
	if err != nil || len(unknown.Groups) != 1 || unknown.Groups[0].Key != "unavailable" || unknown.Current.Count != 1 || !unknown.Current.Complete {
		t.Fatalf("missing scores silently became very-low risks: %+v %v", unknown, err)
	}
}

func TestAgentAnalysisTaskAndEventCountsReuseCanonicalUnitOverview(t *testing.T) {
	data, a, b, foreign := analysisFixture()
	reported := data.GeneratedAt.Add(-time.Hour)
	task := func(org uuid.UUID, status, due string, validReport bool) *entity.QuarterlyReportTask {
		item := &entity.MitigationTask{ID: uuid.New(), Status: status, DueDate: due}
		if validReport {
			item.ReportedAt = &reported
			item.Notes = "Laporan valid dan lengkap."
		}
		return &entity.QuarterlyReportTask{MitigationTask: item, OrganizationID: org}
	}
	data.Tasks = []*entity.QuarterlyReportTask{task(a, "pending", "2026-10-23", false), task(a, "done", "2026-10-23", true), task(a, "done", "2026-10-23", false), task(a, "not_reported", "2026-10-23", false), task(a, "skipped", "2026-10-23", false), task(a, "pending", "2026-10-24", false), task(b, "pending", "2026-10-23", false), task(foreign, "pending", "2026-10-23", false)}
	data.PreviousTasks = []*entity.QuarterlyReportTask{task(a, "pending", "2026-09-01", false)}
	event := &entity.RiskEvent{ID: uuid.New(), OrganizationID: a}
	data.Events = []*entity.RiskEvent{event, event, {ID: uuid.New(), OrganizationID: b}, {ID: uuid.New(), OrganizationID: foreign}}
	input := AnalysisInput{OrganizationIDs: []uuid.UUID{a, b}, Metric: AnalysisOverdueTasks}
	result, err := AnalyzeQuarterlyReport(data, input)
	if err != nil {
		t.Fatal(err)
	}
	if result.Current.Count != 3 || result.Current.Population != 7 || result.Previous == nil || result.Previous.Count != 1 {
		t.Fatalf("canonical reporting/deadline rules diverged: %+v", result)
	}
	input.Metric = AnalysisIncidents
	result, err = AnalyzeQuarterlyReport(data, input)
	if err != nil || result.Current.Count != 2 || result.Previous != nil {
		t.Fatalf("incidents duplicated or missing previous invented: %+v %v", result, err)
	}
	for _, group := range result.Groups {
		if group.Previous != nil || group.Delta != nil {
			t.Fatal("unloaded incident comparison must be null")
		}
	}
}

func TestAgentAnalysisRejectsUnsupportedOrMalformedFilters(t *testing.T) {
	for _, tc := range []struct {
		name  string
		input AnalysisInput
	}{
		{"group", AnalysisInput{GroupBy: "sql"}}, {"metric", AnalysisInput{Metric: "arbitrary"}},
		{"task category", AnalysisInput{Metric: AnalysisOverdueTasks, Category: "operasional"}}, {"task group", AnalysisInput{Metric: AnalysisOverdueTasks, GroupBy: AnalysisByLevel}},
		{"event query", AnalysisInput{Metric: AnalysisIncidents, Query: "ignored?"}}, {"event level", AnalysisInput{Metric: AnalysisIncidents, Level: "tinggi"}},
		{"category", AnalysisInput{Category: "unknown"}}, {"level", AnalysisInput{Level: "extreme"}},
		{"redundant high filter", AnalysisInput{Metric: AnalysisHighRisks, Level: "tinggi"}},
		{"limit", AnalysisInput{Limit: 101}}, {"negative limit", AnalysisInput{Limit: -1}},
		{"cycle", AnalysisInput{Cycle: "2026-Q5"}}, {"zero year", AnalysisInput{Cycle: "0000-Q1"}},
		{"comparison", AnalysisInput{ComparisonCycle: "2026;DROP"}}, {"nil unit", AnalysisInput{OrganizationIDs: []uuid.UUID{uuid.Nil}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := NormalizeAnalysisInput(tc.input); !errors.Is(err, domainerrors.ErrInvalidInput) {
				t.Fatalf("invalid filter accepted: %v", err)
			}
		})
	}
}

func TestAgentAnalysisExplicitScopeCannotIncludeForeignData(t *testing.T) {
	data, a, _, foreign := analysisFixture()
	result, err := AnalyzeQuarterlyReport(data, AnalysisInput{OrganizationIDs: []uuid.UUID{a, a}, GroupBy: AnalysisByOrganization})
	if err != nil {
		t.Fatal(err)
	}
	if result.Current.Count != 3 || len(result.Groups) != 1 || result.Groups[0].Key != a.String() || len(result.Input.OrganizationIDs) != 1 {
		t.Fatalf("foreign or duplicate-scope population included: %+v", result)
	}
	for _, group := range result.Groups {
		if group.Key == foreign.String() {
			t.Fatal("foreign unit leaked")
		}
	}
}
