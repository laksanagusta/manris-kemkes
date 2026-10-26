package agenttools

import (
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	reportuc "github.com/manris/backend/internal/usecase/report"
)

func TestAnalysisDefinitionsUseFlatBoundedSchemas(t *testing.T) {
	kit := &Toolkit{}
	definitions := kit.AnalysisDefinitions()
	if len(definitions) != 2 {
		t.Fatalf("unexpected tools: %+v", definitions)
	}
	for _, definition := range definitions {
		var schema map[string]any
		if err := json.Unmarshal(definition.Parameters, &schema); err != nil {
			t.Fatal(err)
		}
		if schema["type"] != "object" || schema["additionalProperties"] != false || strings.Contains(string(definition.Parameters), `"oneOf"`) {
			t.Fatalf("schema is not a flat strict object: %s", definition.Parameters)
		}
		properties := schema["properties"].(map[string]any)
		if definition.Name == "analyze_report" {
			if properties["organizationIds"].(map[string]any)["maxItems"] != float64(100) || properties["limit"].(map[string]any)["maximum"] != float64(100) {
				t.Fatal("unbounded report query")
			}
		}
	}
}

func TestAnalysisScopeDefaultsToOwnAndRequiresAuthorizedExplicitUnits(t *testing.T) {
	own, child, foreign := uuid.New(), uuid.New(), uuid.New()
	scope := &entity.AccessScope{OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, child}}
	ids, err := reportAnalysisScope(scope, nil)
	if err != nil || len(ids) != 1 || ids[0] != own {
		t.Fatal("descendants automatically broadened report scope")
	}
	ids, err = reportAnalysisScope(scope, []uuid.UUID{child, child})
	if err != nil || len(ids) != 1 || ids[0] != child {
		t.Fatal("authorized explicit descendant rejected")
	}
	if _, err = reportAnalysisScope(scope, []uuid.UUID{own, foreign}); !errors.Is(err, agent.ErrForbidden) {
		t.Fatal("foreign report unit accepted")
	}
	ids, err = reportAnalysisScope(&entity.AccessScope{IsGlobal: true}, nil)
	if err != nil || len(ids) != 0 {
		t.Fatal("true global scope was not preserved")
	}
}

func TestAnalysisRejectsInvalidRequestsBeforeDatabaseAccess(t *testing.T) {
	kit := &Toolkit{}
	for _, tc := range []struct{ name, tool, raw string }{
		{"unknown field", "analyze_report", `{"sql":"select *"}`},
		{"malformed UUID", "analyze_report", `{"organizationIds":["not-an-id"]}`},
		{"incompatible filter", "analyze_report", `{"metric":"incidents","category":"legal"}`},
		{"unknown enum", "analyze_report", `{"metric":"average_model_score"}`},
		{"limit", "analyze_report", `{"limit":101}`},
		{"unit unknown field", "list_report_units", `{"organizationId":"anything"}`},
		{"unit page", "list_report_units", `{"page":-1}`},
		{"unknown tool", "execute_sql", `{}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := kit.ExecuteAnalysis(t.Context(), uuid.New(), tc.tool, json.RawMessage(tc.raw)); !errors.Is(err, agent.ErrInvalid) {
				t.Fatalf("invalid request reached unavailable DB or returned unsafe error: %v", err)
			}
		})
	}
}

func TestAnalysisSourceScopeIncludesEmptyUnitsAndBothPeriods(t *testing.T) {
	ids := []uuid.UUID{uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()}
	data := &entity.QuarterlyReportData{Organizations: []entity.QuarterlyReportOrganization{{ID: ids[0]}}, Risks: []*entity.QuarterlyReportRisk{{Risk: &entity.Risk{OrganizationID: &ids[1]}}}, PreviousRisks: []*entity.QuarterlyReportRisk{{Risk: &entity.Risk{OrganizationID: &ids[2]}}}, Tasks: []*entity.QuarterlyReportTask{{OrganizationID: ids[3]}}, PreviousTasks: []*entity.QuarterlyReportTask{{OrganizationID: ids[4]}}, Events: []*entity.RiskEvent{{OrganizationID: ids[5]}}}
	sources := reportAnalysisSourceScope(data, nil)
	if len(sources) != 6 {
		t.Fatalf("source scope incomplete: %v", sources)
	}
	for _, id := range ids {
		found := false
		for _, source := range sources {
			found = found || source == id
		}
		if !found {
			t.Fatalf("missing source scope %s", id)
		}
	}
}

func TestAnalysisWidgetsPreserveUnknownValuesAndSourceParameters(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	kit := &Toolkit{now: time.Now}
	result := &reportuc.AnalysisResult{Input: reportuc.AnalysisInput{OrganizationIDs: []uuid.UUID{a, b}, Metric: reportuc.AnalysisHighRisks, GroupBy: reportuc.AnalysisByOrganization}, Cycle: "2026-Q4", ComparisonCycle: "2026-Q3", SnapshotAt: time.Now(), Current: reportuc.AnalysisMeasure{Count: 2, Population: 4, Unavailable: 1, Complete: false}, Groups: []reportuc.AnalysisGroup{{Key: a.String(), Label: "Unit A", Current: reportuc.AnalysisMeasure{Count: 2, Population: 4, Unavailable: 1, Complete: false}}}}
	toolResult := kit.reportAnalysisResult(&entity.AccessScope{IsGlobal: true}, []uuid.UUID{a, b}, &entity.QuarterlyReportData{}, result)
	if len(toolResult.Widgets) != 3 {
		t.Fatal("missing structured report components")
	}
	row := toolResult.Widgets[1].Rows[0]
	if row["value"] != nil || row["previous"] != nil || row["delta"] != nil || row["knownCount"] != 2 || len(toolResult.Widgets[2].Rows) != 0 {
		t.Fatal("missing values were presented as exact zeros/counts")
	}
	link, err := url.Parse(row["href"].(string))
	if err != nil {
		t.Fatal(err)
	}
	if link.Query().Get("cycle") != "2026-Q4" || link.Query().Get("compare_cycle") != "2026-Q3" || link.Query().Get("org_id") != a.String() {
		t.Fatalf("incorrect row source parameters: %s", link)
	}
	global, _ := url.Parse(reportAnalysisHref("2026-Q4", "2026-Q3", nil))
	if _, exists := global.Query()["org_id"]; !exists || global.Query().Get("org_id") != "" {
		t.Fatal("global source scope was implicit or absent")
	}
}

func TestCategoryAnalysisProducesChartWithExactGroupedCounts(t *testing.T) {
	kit := &Toolkit{now: time.Now}
	result := &reportuc.AnalysisResult{
		Input: reportuc.AnalysisInput{Metric: reportuc.AnalysisRisks, GroupBy: reportuc.AnalysisByCategory},
		Cycle: "2026-Q4", ComparisonCycle: "2026-Q3", SnapshotAt: time.Now(),
		Groups: []reportuc.AnalysisGroup{
			{Key: "operasional", Label: "Operasional", Current: reportuc.AnalysisMeasure{Count: 7, Complete: true}},
			{Key: "kepatuhan", Label: "Kepatuhan", Current: reportuc.AnalysisMeasure{Count: 0, Complete: true}},
			{Key: "reputasi", Label: "Reputasi", Current: reportuc.AnalysisMeasure{Count: 2, Unavailable: 1, Complete: false}},
		},
	}
	output := kit.reportAnalysisResult(&entity.AccessScope{IsGlobal: true}, nil, &entity.QuarterlyReportData{}, result)
	for _, widget := range output.Widgets {
		if widget.Type != "bar_chart" {
			continue
		}
		if len(widget.Rows) != 2 || widget.Rows[0]["label"] != "Operasional" || widget.Rows[0]["value"] != 7 || widget.Rows[1]["value"] != 0 {
			t.Fatalf("chart changed group counts, omitted zero, or invented incomplete data: %+v", widget.Rows)
		}
		return
	}
	t.Fatal("category analysis omitted the chart")
}
