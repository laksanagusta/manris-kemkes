package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestNormalizeRiskCharterUPRMigration(t *testing.T) {
	content, err := os.ReadFile("000064_normalize_risk_charter_upr_structure.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, snippet := range []string{
		"jsonb_array_elements(charter.upr_structure)",
		"'role', coalesce",
		"'position', coalesce",
		"- 'title'",
	} {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("migration does not contain %q", snippet)
		}
	}
}
