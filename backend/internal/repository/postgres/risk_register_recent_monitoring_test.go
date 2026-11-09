package postgres

import (
	"context"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
)

func TestRecentRegisterMonitoringQuarterWindow(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	for _, tc := range []struct {
		name, anchor string
		want         []string
	}{
		{"WIB new year", "2026-12-31 17:00:00+00", []string{"2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1"}},
		{"before WIB new year", "2026-12-31 16:59:59+00", []string{"2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			join := strings.ReplaceAll(riskRegisterRecentMonitoringJoin, "NOW()", "$1::timestamptz")
			query := "SELECT recent_monitoring.items FROM (SELECT NULL::uuid AS version_group_id) r " + join
			var periods []entity.RecentMonitoringQuarter
			if err := pool.QueryRow(ctx, query, tc.anchor).Scan(&periods); err != nil {
				t.Fatal(err)
			}
			cycles := make([]string, 0, len(periods))
			for _, period := range periods {
				cycles = append(cycles, period.Cycle)
				if period.Status != nil || period.Nilai != nil {
					t.Fatalf("missing period must stay empty: %+v", period)
				}
			}
			if !reflect.DeepEqual(cycles, tc.want) {
				t.Fatalf("cycles = %v, want %v", cycles, tc.want)
			}
		})
	}
}
