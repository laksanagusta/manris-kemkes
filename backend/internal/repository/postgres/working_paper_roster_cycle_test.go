package postgres

import (
	"strings"
	"testing"
)

func TestRosterPreviewUsesEffectiveProfilesAndOneLatestObservation(t *testing.T) {
	query := rosterPreviewQuery()
	for _, required := range []string{"r.effective_from", "< p.cutoff", "DISTINCT ON (rm.version_group_id)", "rm.observed_at DESC", "(rm.status='final') DESC"} {
		if !strings.Contains(query, required) {
			t.Fatalf("roster must use %q", required)
		}
	}
	if strings.Contains(query, "AND r.assessment_cycle = $2") {
		t.Fatal("a Q1 risk must remain eligible in Q2")
	}
}
