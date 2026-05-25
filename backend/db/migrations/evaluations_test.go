package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEvaluationsMigrationDefinesExpectedTablesAndConstraints(t *testing.T) {
	path := filepath.Join("000058_evaluations.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	required := []string{
		"CREATE TABLE evaluation_templates",
		"CREATE TABLE evaluation_template_sections",
		"CREATE TABLE evaluation_template_items",
		"CREATE TABLE evaluations",
		"CREATE TABLE evaluation_sections",
		"CREATE TABLE evaluation_items",
		"CHECK (status IN ('draft','active','archived'))",
		"CHECK (status IN ('draft','final'))",
		"CHECK (answer IN ('unset','yes','no'))",
		"UNIQUE (organization_id, period, template_id)",
		"monitoring_evaluation_kmk",
		"document_completeness",
		"infrastructure_adequacy",
		"implementation_result",
		"mitigation_monitoring",
	}
	for _, want := range required {
		if !strings.Contains(sql, want) {
			t.Fatalf("migration %s does not contain %q", path, want)
		}
	}
	if strings.Contains(sql, "evaluation_mitigation_summaries") {
		t.Fatalf("migration %s must not create evaluation_mitigation_summaries", path)
	}
}

func TestEvaluationsDownMigrationDropsInDependencyOrder(t *testing.T) {
	path := filepath.Join("000058_evaluations.down.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	order := []string{
		"DROP TABLE IF EXISTS evaluation_items",
		"DROP TABLE IF EXISTS evaluation_sections",
		"DROP TABLE IF EXISTS evaluations",
		"DROP TABLE IF EXISTS evaluation_template_items",
		"DROP TABLE IF EXISTS evaluation_template_sections",
		"DROP TABLE IF EXISTS evaluation_templates",
	}

	last := -1
	for _, stmt := range order {
		idx := strings.Index(sql, stmt)
		if idx == -1 {
			t.Fatalf("migration %s does not contain %q", path, stmt)
		}
		if idx < last {
			t.Fatalf("migration %s drops tables in the wrong order around %q", path, stmt)
		}
		last = idx
	}
}
