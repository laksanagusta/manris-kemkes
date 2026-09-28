package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestRiskEventLedgerMigrationDefinesImmutableLedgerStorage(t *testing.T) {
	content, err := os.ReadFile("000066_risk_event_ledger.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, required := range []string{
		"create table if not exists incidents",
		"impact_types text[]",
		"other_impact_type text",
		"actual_impact text",
		"immediate_response text",
		"post_response_condition text",
		"create table if not exists incident_risk_links",
		"created_by uuid",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration missing %q", required)
		}
	}
}
