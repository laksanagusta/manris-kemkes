package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRiskMonitoringsControlEffectivenessMigrationAddsColumn(t *testing.T) {
	path := filepath.Join("000073_risk_monitorings_control_effectiveness.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	if !strings.Contains(sql, "ADD COLUMN IF NOT EXISTS draft_control_effectiveness TEXT NOT NULL DEFAULT ''") {
		t.Fatalf("migration %s does not add draft_control_effectiveness column", path)
	}
}

func TestRiskMonitoringsControlEffectivenessDownDropsColumn(t *testing.T) {
	path := filepath.Join("000073_risk_monitorings_control_effectiveness.down.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	if !strings.Contains(sql, "DROP COLUMN IF EXISTS draft_control_effectiveness") {
		t.Fatalf("migration %s does not drop draft_control_effectiveness column", path)
	}
}
