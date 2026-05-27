package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEvaluationSequenceMigrationAddsCodeAndSequence(t *testing.T) {
	path := filepath.Join("000069_add_evaluation_sequence_code.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"ADD COLUMN sequence_no INTEGER",
		"ADD COLUMN code TEXT",
		"ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at ASC, id ASC)",
		"code = 'EV-' || LPAD(numbered.sequence_no::text, 4, '0')",
		"ALTER COLUMN sequence_no SET NOT NULL",
		"ALTER COLUMN code SET NOT NULL",
		"UNIQUE (organization_id, sequence_no)",
		"idx_evaluations_org_code",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}

func TestEvaluationSequenceDownMigrationDropsNewColumns(t *testing.T) {
	path := filepath.Join("000069_add_evaluation_sequence_code.down.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"DROP INDEX IF EXISTS idx_evaluations_org_code",
		"DROP CONSTRAINT IF EXISTS evaluations_organization_sequence_no_key",
		"DROP COLUMN IF EXISTS code",
		"DROP COLUMN IF EXISTS sequence_no",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
}
