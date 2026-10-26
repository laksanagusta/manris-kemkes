package agent

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestResponseWidgetContractsValidateAndRoundTrip(t *testing.T) {
	score := 20
	risk := RiskDetail{ID: uuid.NewString(), OrganizationID: uuid.NewString(), Code: "R-241", Score: &score, Href: "/risk/register/" + uuid.NewString(), Actions: []WidgetAction{{Label: "Lihat mitigasi", Prompt: "Baca risiko ini", Skills: []string{"risks", "mitigations"}}}}
	widgets := []Widget{{Type: "risk_detail", Risk: &risk}, {Type: "priority_list", Priorities: &PriorityList{Items: []PriorityRisk{{Risk: risk}}, Total: 1, Page: 1, Limit: 5}}, {Type: "period_comparison", Comparison: &PeriodComparison{Rows: []ComparisonRow{{Label: "Risiko tinggi", Current: nil, Previous: &score, Delta: nil}}, Href: "/reports?cycle=2026-Q4"}}}
	if err := validateWidgets(widgets); err != nil {
		t.Fatal(err)
	}
	encoded, err := json.Marshal(widgets)
	if err != nil {
		t.Fatal(err)
	}
	var decoded []Widget
	if err = json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded[0].Risk.Actions[0].Skills[1] != "mitigations" || decoded[2].Comparison.Rows[0].Current != nil {
		t.Fatal("snapshot lost action or null semantics")
	}
	risk.Href = "javascript:alert(1)"
	if err = validateWidgets(widgets); err == nil {
		t.Fatal("unsafe nested href accepted")
	}
	risk.Href = "/risk/register"
	risk.Actions[0].Skills = []string{"admin"}
	if err = validateWidgets(widgets); err == nil {
		t.Fatal("unknown action skill accepted")
	}
	if err = validateWidgets([]Widget{{Type: "risk_detail"}}); err == nil {
		t.Fatal("missing typed payload accepted")
	}
}
