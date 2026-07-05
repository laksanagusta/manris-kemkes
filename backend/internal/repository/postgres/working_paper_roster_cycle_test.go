package postgres

import (
	"strings"
	"testing"
)

func TestRosterPreviewQueryUsesAssessmentCycleInsteadOfEffectiveDates(t *testing.T) {
	query := rosterPreviewQuery()

	if !strings.Contains(query, "r.assessment_cycle = $2") {
		t.Fatalf("roster query must filter risks by assessment cycle:\n%s", query)
	}
	for _, forbidden := range []string{
		"COALESCE(r.review_approved_at, r.created_at) <",
		"r.archived_at >=",
	} {
		if strings.Contains(query, forbidden) {
			t.Fatalf("roster query must not filter cycle membership by %q:\n%s", forbidden, query)
		}
	}
}
