package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFormalReportsConstraintAllowsMonitoringEvaluationReport(t *testing.T) {
	path := filepath.Join("000057_formal_reports_single_type.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	sql := string(data)
	if !strings.Contains(sql, "monitoring_evaluation_report") {
		t.Fatalf("migration %s does not allow monitoring_evaluation_report", path)
	}
	if strings.Contains(sql, "annual_risk_profile") ||
		strings.Contains(sql, "semiannual_mr_implementation") ||
		strings.Contains(sql, "semiannual_mr_supervision") ||
		strings.Contains(sql, "tmpmr_report") {
		t.Fatalf("migration %s still allows legacy report types", path)
	}
	if !strings.Contains(sql, "formal_reports_report_type_check") {
		t.Fatalf("migration %s does not update formal_reports_report_type_check", path)
	}
}
