//go:build integration

package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/timeutil"
)

func TestConfiguredQuarterlyReportUsesRuleRosterAndCalendar(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	// Existing development rules are restored by the enclosing rollback.
	if _, err := tx.Exec(ctx, `UPDATE monitoring_rules SET active=false WHERE year=2026 AND active`); err != nil {
		t.Fatal(err)
	}
	f := seedConfiguredFixture(t, ctx, tx)
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, timeutil.JakartaLocation())
	end := start.AddDate(0, 6, 0)
	period := repository.QuarterlyReportPeriod{ProfileYear: 2026, RuleID: &f.rule, MonitoringPeriodID: &f.period, Cycle: "2026 · Semester I", Start: start, End: end}
	data, err := loadQuarterlyPeriod(ctx, tx, period.Cycle, start, end, []uuid.UUID{f.org}, period)
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Risks) != 1 || data.Risks[0].ID != f.risk.ID {
		t.Fatalf("missing selected rule roster: %+v", data.Risks)
	}
	other := uuid.New()
	period.RuleID = &other
	data, err = loadQuarterlyPeriod(ctx, tx, period.Cycle, start, end, []uuid.UUID{f.org}, period)
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Risks) != 0 || len(data.Tasks) != 0 {
		t.Fatal("data leaked from another rule")
	}
	period.RuleID = &f.rule
	// A historical cutoff before this member became effective must stay empty.
	period.End = start
	data, err = loadQuarterlyPeriod(ctx, tx, period.Cycle, start, start, []uuid.UUID{f.org}, period)
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Risks) != 0 {
		t.Fatal("historical report incorrectly used today's cutoff")
	}
}
