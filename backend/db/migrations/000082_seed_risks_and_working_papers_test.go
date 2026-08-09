package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestSeedRisksAndWorkingPapersMigrationContainsExpectedSeedCounts(t *testing.T) {
	body, err := os.ReadFile("000082_seed_risks_and_working_papers.up.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}

	sql := string(body)
	riskStart := strings.Index(sql, "INSERT INTO risks")
	wpStart := strings.Index(sql, "INSERT INTO working_papers")
	linkStart := strings.Index(sql, "INSERT INTO working_paper_risks")
	if riskStart == -1 || wpStart == -1 || linkStart == -1 {
		t.Fatal("expected all three seed statements in migration")
	}
	if got := strings.Count(sql[riskStart:wpStart], "('21000000-0000-0000-0000-000000000"); got != 20 {
		t.Fatalf("expected 20 risk rows, got %d", got)
	}
	if got := strings.Count(sql[wpStart:linkStart], "('31000000-0000-0000-0000-000000000"); got != 20 {
		t.Fatalf("expected 20 working paper rows, got %d", got)
	}
	if got := strings.Count(sql[linkStart:], "('31000000-0000-0000-0000-000000000"); got != 20 {
		t.Fatalf("expected 20 working paper link rows, got %d", got)
	}
	if !strings.Contains(sql, "ON CONFLICT (working_paper_id, risk_id) DO NOTHING") {
		t.Fatal("expected working paper risk link seed")
	}
}
