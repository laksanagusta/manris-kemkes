package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFormalReportsConstraintAllowsMonitoringEvaluationReport(t *testing.T) {
	path := filepath.Join("000056_formal_reports_monitoring_evaluation_type.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	if !strings.Contains(sql, "monitoring_evaluation_report") {
		t.Fatalf("migration %s does not allow monitoring_evaluation_report", path)
	}
	if !strings.Contains(sql, "formal_reports_report_type_check") {
		t.Fatalf("migration %s does not update formal_reports_report_type_check", path)
	}
}
