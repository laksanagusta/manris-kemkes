package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRiskMonitoringsMigrationDefinesExpectedTableAndIndexes(t *testing.T) {
	path := filepath.Join("000072_risk_monitorings.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"CREATE TABLE IF NOT EXISTS risk_monitorings",
		"source_risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE RESTRICT",
		"result_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL",
		"CHECK (assessment_cycle ~ '^[0-9]{4}-H[12]$')",
		"CHECK (status IN ('draft', 'finalized', 'void'))",
		"CHECK (mode IN ('score_only', 'with_profile_revision'))",
		"source_probability INTEGER NOT NULL CHECK (source_probability BETWEEN 1 AND 5)",
		"source_impact INTEGER NOT NULL CHECK (source_impact BETWEEN 1 AND 5)",
		"source_nilai NUMERIC(10,4) NOT NULL DEFAULT 0",
		"observed_level TEXT NOT NULL DEFAULT ''",
		"draft_mitigations JSONB NOT NULL DEFAULT '[]'::jsonb",
		"profile_change_summary JSONB NOT NULL DEFAULT '[]'::jsonb",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_monitorings_active_draft",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_monitorings_finalized_source_cycle",
		"CREATE INDEX IF NOT EXISTS idx_risk_monitorings_source",
		"CREATE INDEX IF NOT EXISTS idx_risk_monitorings_result",
		"CREATE INDEX IF NOT EXISTS idx_risk_monitorings_cycle_status",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
	if strings.Contains(sql, "risk_monitoring_mitigation_progress") {
		t.Fatalf("migration %s must not create risk_monitoring_mitigation_progress", path)
	}
}

func TestRiskMonitoringsDownDropsTableAndIndexes(t *testing.T) {
	path := filepath.Join("000072_risk_monitorings.down.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"DROP INDEX IF EXISTS idx_risk_monitorings_cycle_status",
		"DROP INDEX IF EXISTS idx_risk_monitorings_result",
		"DROP INDEX IF EXISTS idx_risk_monitorings_source",
		"DROP INDEX IF EXISTS idx_risk_monitorings_finalized_source_cycle",
		"DROP INDEX IF EXISTS idx_risk_monitorings_active_draft",
		"DROP TABLE IF EXISTS risk_monitorings",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}
