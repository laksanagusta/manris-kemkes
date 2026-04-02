package entity

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRiskCycleDetailedComparisonItem_MarshalIncludesEmptyDiffArrays(t *testing.T) {
	item := RiskCycleDetailedComparisonItem{
		ChangeCategory:  "stable",
		VersionGroupID:  "group-1",
		Code:            "R-001",
		Title:           "Risiko stabil",
		FieldDiffs:      []*RiskFieldDiff{},
		MitigationDiffs: []*RiskMitigationDiff{},
	}

	encoded, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("expected no marshal error, got %v", err)
	}
	jsonString := string(encoded)
	if !strings.Contains(jsonString, `"fieldDiffs":[]`) {
		t.Fatalf("expected fieldDiffs to be encoded as empty array, got %s", jsonString)
	}
	if !strings.Contains(jsonString, `"mitigationDiffs":[]`) {
		t.Fatalf("expected mitigationDiffs to be encoded as empty array, got %s", jsonString)
	}
}
