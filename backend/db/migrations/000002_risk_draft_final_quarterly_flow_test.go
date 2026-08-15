package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestRiskDraftFinalQuarterlyFlowCanonicalisesLegacyPeriods(t *testing.T) {
	body, err := os.ReadFile("000002_risk_draft_final_quarterly_flow.up.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	sql := string(body)

	for _, snippet := range []string{
		"WHEN assessment_cycle ~ '^[0-9]{4}-H1$' THEN LEFT(assessment_cycle, 4) || '-Q2'",
		"WHEN assessment_cycle ~ '^[0-9]{4}-H2$' THEN LEFT(assessment_cycle, 4) || '-Q4'",
		"UPDATE working_papers",
		"UPDATE working_paper_risk_exclusions",
		"UPDATE risks\nSET assessment_cycle = EXTRACT(YEAR FROM effective_from)",
		"risks_assessment_cycle_quarter_check",
		"working_papers_assessment_cycle_quarter_check",
		"working_paper_risk_exclusions_cycle_quarter_check",
		"risk_monitorings_assessment_cycle_check",
		"CHECK (assessment_cycle ~ '^[0-9]{4}-Q[1-4]$')",
		"working_paper_risks_risk_id_fkey",
		"ON DELETE CASCADE",
		"risks_previous_risk_id_fkey",
		"Preserve monitoring history",
		"completed_monitoring_id = monitoring.id",
	} {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("migration missing %q", snippet)
		}
	}

	if strings.Contains(sql, "(Q[1-4]|H[12])") {
		t.Fatal("up migration must not leave a mixed H/Q constraint")
	}
}

func TestRiskDraftFinalQuarterlyFlowDownKeepsRollbackReadable(t *testing.T) {
	body, err := os.ReadFile("000002_risk_draft_final_quarterly_flow.down.sql")
	if err != nil {
		t.Fatalf("read down migration: %v", err)
	}
	sql := string(body)
	if !strings.Contains(sql, "working_papers_assessment_cycle_semester_check") ||
		!strings.Contains(sql, "working_paper_risk_exclusions_cycle_semester_check") {
		t.Fatal("down migration must restore compatibility checks for working paper periods")
	}
}
