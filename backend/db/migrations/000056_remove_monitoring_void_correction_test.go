package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRemoveMonitoringVoidCorrectionMigrationDeletesLegacyState(t *testing.T) {
	path := filepath.Join("000056_remove_monitoring_void_correction.up.sql")
	sql, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	content := strings.ToLower(string(sql))
	for _, snippet := range []string{
		"where status = 'void'",
		"drop column if exists voided_by",
		"drop column if exists voided_at",
		"drop column if exists void_reason",
		"check (status in ('draft', 'final'))",
	} {
		if !strings.Contains(content, snippet) {
			t.Fatalf("migration does not contain %q", snippet)
		}
	}
}
