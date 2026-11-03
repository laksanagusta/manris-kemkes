package postgres

import (
	"testing"
	"time"
)

func TestMonitoringEvidenceWindowUsesJakartaQuarter(t *testing.T) {
	start, end, err := monitoringEvidenceWindow("2026-Q4")
	if err != nil {
		t.Fatal(err)
	}
	if start.UTC().Format(time.RFC3339) != "2026-09-30T17:00:00Z" || end.UTC().Format(time.RFC3339) != "2026-12-31T17:00:00Z" {
		t.Fatalf("wrong bounds %v %v", start, end)
	}
	if _, _, err := monitoringEvidenceWindow("2026-Q5"); err == nil {
		t.Fatal("invalid quarter accepted")
	}
}
