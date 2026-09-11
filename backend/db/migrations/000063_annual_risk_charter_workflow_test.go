package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestAnnualRiskCharterWorkflowMigration(t *testing.T) {
	content, err := os.ReadFile("000063_annual_risk_charter_workflow.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, snippet := range []string{
		"add column if not exists title",
		"add column if not exists legal_bases jsonb",
		"add column if not exists stakeholders jsonb",
		"add column if not exists version_group_id uuid",
		"risk_charters_one_current_per_year_idx",
		"when 'approved' then 'active'",
		"when 'in_review' then 'draft'",
		"left(period, 4)",
		"piagam penerapan manajemen risiko",
		"is_current = ranked.current_rank = 1",
	} {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("migration does not contain %q", snippet)
		}
	}
}
