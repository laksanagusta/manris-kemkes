package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRiskMonitoringsDraftPayloadMigrationAddsPayloadAndDropsDraftColumns(t *testing.T) {
	path := filepath.Join("000074_risk_monitorings_draft_payload.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"ADD COLUMN IF NOT EXISTS draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb",
		"UPDATE risk_monitorings",
		"jsonb_build_object(",
		"'riskSource'",
		"'controlEffectiveness'",
		"DROP COLUMN IF EXISTS draft_title",
		"DROP COLUMN IF EXISTS draft_mitigations",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}

func TestRiskMonitoringsDraftPayloadDownRestoresDraftColumns(t *testing.T) {
	path := filepath.Join("000074_risk_monitorings_draft_payload.down.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"ADD COLUMN IF NOT EXISTS draft_title TEXT NOT NULL DEFAULT ''",
		"ADD COLUMN IF NOT EXISTS draft_control_effectiveness TEXT NOT NULL DEFAULT ''",
		"COALESCE(draft_payload->>'title', '')",
		"DROP COLUMN IF EXISTS draft_payload",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}
