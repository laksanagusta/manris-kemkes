package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestFinalizeUnreportedMitigationTasksMigrationAddsTerminalStatus(t *testing.T) {
	content, err := os.ReadFile("000062_finalize_unreported_mitigation_tasks.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, snippet := range []string{
		"drop constraint if exists mitigation_tasks_status_check",
		"add constraint mitigation_tasks_status_check",
		"'not_reported'",
	} {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("migration does not contain %q", snippet)
		}
	}
}
