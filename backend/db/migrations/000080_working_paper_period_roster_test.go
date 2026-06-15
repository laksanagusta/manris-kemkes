package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWorkingPaperPeriodRosterMigrationContainsRequiredInvariants(t *testing.T) {
	path := filepath.Join("000080_working_paper_period_roster.up.sql")

	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}
	sql := string(body)

	required := []string{
		"ADD COLUMN version_group_id UUID",
		"ADD COLUMN source_risk_id UUID",
		"ADD COLUMN monitoring_id UUID",
		"ADD COLUMN result_risk_id UUID",
		"CREATE UNIQUE INDEX uq_working_paper_risks_group",
		"ADD COLUMN version_group_id UUID",
		"CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active",
		"CREATE TABLE working_paper_risk_exclusions",
		"UNIQUE (working_paper_id, version_group_id)",
	}

	for _, snippet := range required {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("migration missing %q", snippet)
		}
	}
}

func TestWorkingPaperPeriodRosterDownMigrationRemovesSchema(t *testing.T) {
	path := filepath.Join("000080_working_paper_period_roster.down.sql")

	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}
	sql := string(body)

	required := []string{
		"DROP TABLE IF EXISTS working_paper_risk_exclusions",
		"DROP INDEX IF EXISTS uq_working_paper_risks_group",
		"DROP COLUMN IF EXISTS result_risk_id",
		"DROP COLUMN IF EXISTS version_group_id",
		"DROP INDEX IF EXISTS uq_risk_monitorings_group_cycle_active",
		"DROP COLUMN IF EXISTS version_group_id",
	}

	for _, snippet := range required {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("down migration missing %q", snippet)
		}
	}
}
