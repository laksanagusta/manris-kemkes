package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestRemoveLegacyRiskCharterUPRTitleMigration(t *testing.T) {
	content, err := os.ReadFile("000065_remove_legacy_risk_charter_upr_title.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	if !strings.Contains(sql, ")) - 'title'") {
		t.Fatal("migration must remove the legacy title key after normalization")
	}
}
