package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestRemoveMonitoringObstacleFollowUpMigration(t *testing.T) {
	body, err := os.ReadFile("000003_remove_monitoring_obstacle_follow_up.up.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	sql := string(body)
	for _, column := range []string{"mitigation_obstacles", "mitigation_follow_up"} {
		if !strings.Contains(sql, "DROP COLUMN IF EXISTS "+column) {
			t.Fatalf("migration must drop %s", column)
		}
	}
}
