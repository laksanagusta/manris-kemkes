package postgres

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"testing"
)

// All inputs are SQL VALUES; this test never inserts or updates application data.
func TestReportingDueFilterReadIntegration(t *testing.T) {
	dsn := os.Getenv("OPERATOR_WORK_READ_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires read-only OPERATOR_WORK_READ_DATABASE_URL")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["default_transaction_read_only"] = "on"
	ctx := context.Background()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	query := `WITH clock AS (SELECT ` + businessDateSQL + ` today),
        risks AS (SELECT 'family'::text version_group_id,'final'::text status,true is_current,$6::timestamptz archived_at),
        risk_monitorings AS (SELECT 1 id,$3::text status,$4::text transaction_kind,1 monitoring_period_id),
        monitoring_rule_periods AS (SELECT 1 id,today + $5::int opens_on,today + $7::int closes_on FROM clock)
        SELECT ` + reportingDuePredicate() + `
        FROM clock CROSS JOIN (SELECT $1::text status,$2::timestamptz reported_at,$8::int monitoring_id) t
        CROSS JOIN (SELECT $9::text status,'family'::text version_group_id) r`
	for _, tt := range []struct {
		name, status, parent, kind, riskStatus string
		reported, archived                     bool
		opens, closes, parentID                int
		want                                   bool
	}{
		{"open draft", "pending", "draft", "monitoring", "final", false, false, -1, 1, 1, true},
		{"same day", "pending", "draft", "monitoring", "final", false, false, 0, 0, 1, true},
		{"future window", "pending", "draft", "monitoring", "final", false, false, 1, 2, 1, false},
		{"closed window", "pending", "draft", "monitoring", "final", false, false, -2, -1, 1, false},
		{"reported in progress", "pending", "draft", "monitoring", "final", true, false, -1, 1, 1, false},
		{"final monitoring", "pending", "final", "monitoring", "final", false, false, -1, 1, 1, false},
		{"revision", "pending", "draft", "revision", "final", false, false, -1, 1, 1, false},
		{"standalone", "pending", "draft", "monitoring", "final", false, false, -1, 1, 0, false},
		{"draft risk", "pending", "draft", "monitoring", "draft", false, false, -1, 1, 1, false},
		{"archived", "pending", "draft", "monitoring", "final", false, true, -1, 1, 1, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var archived, reported *string
			recorded := "2026-01-01T00:00:00Z"
			if tt.archived {
				archived = &recorded
			}
			if tt.reported {
				reported = &recorded
			}
			var got bool
			if err := pool.QueryRow(ctx, query, tt.status, reported, tt.parent, tt.kind, tt.opens, archived, tt.closes, tt.parentID, tt.riskStatus).Scan(&got); err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}

	// Exercise real count, search, period and pagination SQL with an empty scope fixture.
	repo := NewMitigationTaskRepository(pool)
	for _, page := range []int{1, 2} {
		tasks, total, err := repo.ListAllPaginated(ctx, []uuid.UUID{uuid.New()}, "distribution", "needs_reporting", "2026-Q3", page, 10)
		if err != nil || total != 0 || len(tasks) != 0 {
			t.Fatalf("filtered list: %v, %d, %d", err, total, len(tasks))
		}
	}
}
