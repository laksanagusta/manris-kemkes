package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestSemesterOnlyRiskCyclesMigration(t *testing.T) {
	body, err := os.ReadFile("000081_semester_only_risk_cycles.up.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	sql := string(body)

	required := []string{
		"duplicate active risk monitoring would exist after semester normalization",
		"WHEN assessment_cycle ~ '^[0-9]{4}-Q[12]$' THEN LEFT(assessment_cycle, 4) || '-H1'",
		"WHEN assessment_cycle ~ '^[0-9]{4}-Q[34]$' THEN LEFT(assessment_cycle, 4) || '-H2'",
		"UPDATE mitigation_tasks",
		"UPDATE working_papers",
		"UPDATE working_paper_risk_exclusions",
		"CHECK (assessment_cycle ~ '^[0-9]{4}-H[12]$')",
		"ADD CONSTRAINT risks_assessment_cycle_semester_check",
		"ADD CONSTRAINT working_papers_assessment_cycle_semester_check",
		"ADD CONSTRAINT working_paper_risk_exclusions_cycle_semester_check",
		"CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active",
	}
	for _, snippet := range required {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("migration missing %q", snippet)
		}
	}
}

func TestSemesterOnlyRiskCyclesDownMigrationDoesNotInventQuarters(t *testing.T) {
	body, err := os.ReadFile("000081_semester_only_risk_cycles.down.sql")
	if err != nil {
		t.Fatalf("read down migration: %v", err)
	}
	sql := string(body)

	if strings.Contains(sql, "UPDATE risk_monitorings") {
		t.Fatal("down migration must not invent quarter values")
	}
	if !strings.Contains(sql, `CHECK (assessment_cycle ~ '^[0-9]{4}-(H[12]|Q[1-4])$')`) {
		t.Fatal("down migration must restore a compatibility constraint")
	}
}
