//go:build integration

package postgres

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"testing"
)

func TestConfiguredUnitProgressSeparatesRulePeriodsAndScope(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	fixture := seedConfiguredFixture(t, ctx, tx)
	if _, err := tx.Exec(ctx, `SET CONSTRAINTS ALL DEFERRED`); err != nil {
		t.Fatal(err)
	}
	unusedRule := uuid.New()
	if _, err := tx.Exec(ctx, `INSERT INTO monitoring_rules(id,name,year,frequency,active) VALUES($1,'Unused rule profile',2026,'semester',false)`, unusedRule); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO monitoring_rule_periods(id,rule_id,label,ordinal,opens_on,closes_on) SELECT gen_random_uuid(),$1,label,ordinal,opens_on,closes_on FROM monitoring_rule_periods WHERE rule_id=$2`, unusedRule, fixture.rule); err != nil {
		t.Fatal(err)
	}
	profiles, err := listUnitProgressRuleProfiles(ctx, tx)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, profile := range profiles {
		if profile.ID == unusedRule.String() {
			found = true
			if len(profile.Periods) != 2 || profile.Label != "Unused rule profile" {
				t.Fatalf("unexpected rule profile: %+v", profile)
			}
		}
	}
	if !found {
		t.Fatal("rule without annual profile missing from filter choices")
	}
	monitoring := fixtureMonitoring(fixture)
	if err := insertRiskMonitoring(ctx, tx, monitoring); err != nil {
		t.Fatal(err)
	}
	start, end, err := entity.MonitoringPeriodCalendarBounds(2026, "semester", 1)
	if err != nil {
		t.Fatal(err)
	}
	period := repository.QuarterlyReportPeriod{Cycle: "Semester I", ProfileYear: 2026, RuleID: &fixture.rule, MonitoringPeriodID: &fixture.period, Start: start, End: end.AddDate(0, 0, 1)}
	rows, err := loadUnitProgressRisks(ctx, tx, period, []uuid.UUID{fixture.org})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].MonitoringID == nil || *rows[0].MonitoringID != monitoring.ID {
		t.Fatalf("rows=%+v", rows)
	}
	rows, err = loadUnitProgressRisks(ctx, tx, period, []uuid.UUID{uuid.New()})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 0 {
		t.Fatal("foreign unit returned risks")
	}
	otherPeriod := uuid.New()
	period.MonitoringPeriodID = &otherPeriod
	rows, err = loadUnitProgressRisks(ctx, tx, period, []uuid.UUID{fixture.org})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].MonitoringID != nil {
		t.Fatal("another period leaked monitoring")
	}
	if _, err := loadUnitProgressPapers(ctx, tx, period, []uuid.UUID{fixture.org}); err != nil {
		t.Fatal(err)
	}
	if _, err := loadUnitProgressEvaluations(ctx, tx, period, []uuid.UUID{fixture.org}); err != nil {
		t.Fatal(err)
	}
	if _, err := loadQuarterlyTasks(ctx, tx, period.Cycle, period.Start, period.End, []uuid.UUID{fixture.org}, period); err != nil {
		t.Fatal(err)
	}
}
