package agenttools

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
)

func TestResponseToolsRejectInvalidInputBeforeReadingDatabase(t *testing.T) {
	kit := &Toolkit{}
	for _, tc := range []struct{ name, raw string }{
		{"compare_periods", `{"page":0}`}, {"list_priority_risks", `{"comparisonCycle":""}`},
		{"list_priority_risks", `{"limit":101}`}, {"list_priority_risks", `{"cycle":"0000-Q1"}`},
		{"compare_periods", `{"organizationIds":["foreign-name"]}`}, {"compare_periods", `{"cycle":"2026-H1"}`},
	} {
		if _, err := kit.Execute(t.Context(), uuid.New(), tc.name, json.RawMessage(tc.raw)); !errors.Is(err, agent.ErrInvalid) {
			t.Fatalf("%s %s: invalid input reached DB: %v", tc.name, tc.raw, err)
		}
	}
}

func TestComparisonWidgetUsesCompleteCanonicalMeasuresAndScope(t *testing.T) {
	org := uuid.New()
	data := &entity.QuarterlyReportData{Cycle: "2026-Q4", ComparisonCycle: "2026-Q3", GeneratedAt: time.Now(), Warnings: []string{"Peringatan sumber"}, Organizations: []entity.QuarterlyReportOrganization{{ID: org, Name: "Unit A"}}, Risks: []*entity.QuarterlyReportRisk{{Risk: &entity.Risk{ID: uuid.New(), OrganizationID: &org, Nilai: 20}}, {Risk: &entity.Risk{ID: uuid.New(), OrganizationID: &org, Nilai: 0}}}}
	kit := &Toolkit{now: time.Now}
	w, err := kit.comparisonWidget(&entity.AccessScope{OrganizationID: &org}, []uuid.UUID{org}, data)
	if err != nil {
		t.Fatal(err)
	}
	rows := w.Comparison.Rows
	if *rows[0].Current != 2 || *rows[0].Previous != 0 || *rows[0].Delta != 2 {
		t.Fatalf("legitimate zero changed: %+v", rows[0])
	}
	if rows[1].Current != nil || rows[1].Delta != nil || *rows[1].Previous != 0 {
		t.Fatal("missing scores presented as exact count or delta")
	}
	if !strings.Contains(w.Comparison.Href, org.String()) || !strings.Contains(w.RefreshAction.Prompt, org.String()) || !strings.Contains(w.RefreshAction.Prompt, "2026-Q3") || len(w.Comparison.Warnings) == 0 {
		t.Fatal("scope, periods, or warning lost")
	}
}

func TestPriorityWidgetBindsPageActionsToOriginalScopeAndPeriod(t *testing.T) {
	org := uuid.New()
	kit := &Toolkit{now: time.Now}
	data := &entity.QuarterlyReportData{Cycle: "2026-Q4", GeneratedAt: time.Now()}
	for i := 0; i < 7; i++ {
		data.Risks = append(data.Risks, &entity.QuarterlyReportRisk{Risk: &entity.Risk{ID: uuid.New(), OrganizationID: &org, Nilai: 20}})
	}
	w, err := kit.priorityWidget(&entity.AccessScope{OrganizationID: &org}, []uuid.UUID{org}, data, responseArgs{Page: 1, Limit: 5})
	if err != nil {
		t.Fatal(err)
	}
	if w.Priorities.Total != 7 || len(w.Priorities.Items) != 5 || len(w.Actions) != 1 {
		t.Fatal("population or page truncated incorrectly")
	}
	prompt := w.Actions[0].Prompt
	if !strings.Contains(prompt, "page 2") || !strings.Contains(prompt, org.String()) || !strings.Contains(prompt, "2026-Q4") {
		t.Fatalf("page context lost: %s", prompt)
	}
	r := w.Priorities.Items[0].Risk
	for _, action := range r.Actions {
		if !strings.Contains(action.Prompt, r.ID) || !strings.Contains(action.Prompt, org.String()) || !strings.Contains(action.Prompt, "2026-Q4") {
			t.Fatal("risk action lost scope")
		}
	}
}
