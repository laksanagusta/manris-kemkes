package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMakeRiskScoresDerivedMigrationUsesCanonicalValues(t *testing.T) {
	path := filepath.Join("000061_make_risk_scores_derived.up.sql")
	sql, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	content := strings.ToLower(string(sql))
	for _, snippet := range []string{
		"drop column if exists inherent_score",
		"drop column if exists target_score",
		"api derives inherentscore by rounding",
		"api derives targetscore by rounding",
	} {
		if !strings.Contains(content, snippet) {
			t.Fatalf("migration does not contain %q", snippet)
		}
	}
	for _, forbidden := range []string{
		"add column inherent_score",
		"add column target_score",
		"generated always as",
	} {
		if strings.Contains(content, forbidden) {
			t.Fatalf("migration must physically remove %q, found %q", forbidden, forbidden)
		}
	}
}
