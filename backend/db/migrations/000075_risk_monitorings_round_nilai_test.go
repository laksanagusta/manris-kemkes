package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRiskMonitoringsRoundNilaiMigrationRoundsAndNarrowsScale(t *testing.T) {
	path := filepath.Join("000075_risk_monitorings_round_nilai.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"UPDATE risk_monitorings",
		"SET source_nilai = ROUND(source_nilai)",
		"ALTER COLUMN source_nilai TYPE NUMERIC(10,0)",
		"ALTER COLUMN observed_nilai TYPE NUMERIC(10,0)",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}

func TestRiskMonitoringsRoundNilaiDownRestoresScale(t *testing.T) {
	path := filepath.Join("000075_risk_monitorings_round_nilai.down.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"ALTER COLUMN source_nilai TYPE NUMERIC(10,4)",
		"ALTER COLUMN observed_nilai TYPE NUMERIC(10,4)",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}
