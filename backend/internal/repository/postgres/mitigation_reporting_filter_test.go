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
	query := `WITH clock AS (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date today)
 SELECT ` + reportingDuePredicate() + `
 FROM clock CROSS JOIN LATERAL
 (SELECT $1::text status, today + $2::int due_date, today + $3::int period_end) t
 CROSS JOIN (SELECT $4::text status, $5::boolean is_current, $6::timestamptz archived_at, NULL::text archived_reason) r`
	for _, tt := range []struct {
		name, status            string
		due, end                int
		riskStatus              string
		current, archived, want bool
	}{
		{"overdue", "overdue", -40, -41, "final", true, false, true},
		{"today", "pending", 0, -1, "final", true, false, true},
		{"seven days", "pending", 7, -1, "final", true, false, true},
		{"eight days", "pending", 8, -1, "final", true, false, false},
		{"period blocked", "pending", 7, 1, "final", true, false, false},
		{"same period deadline", "pending", 7, 7, "final", true, false, true},
		{"reported", "done", 0, -1, "final", true, false, false},
		{"not reported closed", "not_reported", -4, -5, "final", true, false, false},
		{"draft risk", "pending", 0, -1, "draft", true, false, false},
		{"old version", "pending", 0, -1, "final", false, false, false},
		{"archived", "pending", 0, -1, "final", true, true, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var archived *string
			if tt.archived {
				v := "2026-01-01T00:00:00Z"
				archived = &v
			}
			var got bool
			if err := pool.QueryRow(ctx, query, tt.status, tt.due, tt.end, tt.riskStatus, tt.current, archived).Scan(&got); err != nil {
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
