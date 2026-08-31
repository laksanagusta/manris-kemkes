package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDropKRIFeatureMigrationRemovesKRIData(t *testing.T) {
	path := filepath.Join("000055_drop_kri_feature.up.sql")
	sql, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	content := strings.ToLower(string(sql))
	for _, table := range []string{"kri_reports", "kris"} {
		if !strings.Contains(content, "drop table if exists "+table+" cascade") {
			t.Fatalf("migration does not remove %s", table)
		}
	}
}
