package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWorkingPaperSequenceMigrationAddsCodeAndSequence(t *testing.T) {
	path := filepath.Join("000070_add_working_paper_sequence_code.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"ADD COLUMN sequence_no INTEGER",
		"ADD COLUMN code TEXT",
		"ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY created_at ASC, id ASC)",
		"code = 'WP-' || LPAD(numbered.sequence_no::text, 4, '0')",
		"ALTER COLUMN sequence_no SET NOT NULL",
		"ALTER COLUMN code SET NOT NULL",
		"UNIQUE (org_id, sequence_no)",
		"idx_working_papers_org_code",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}

func TestWorkingPaperSequenceDownMigrationDropsNewColumns(t *testing.T) {
	path := filepath.Join("000070_add_working_paper_sequence_code.down.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"DROP INDEX IF EXISTS idx_working_papers_org_code",
		"DROP CONSTRAINT IF EXISTS working_papers_org_sequence_no_key",
		"DROP COLUMN IF EXISTS code",
		"DROP COLUMN IF EXISTS sequence_no",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}
