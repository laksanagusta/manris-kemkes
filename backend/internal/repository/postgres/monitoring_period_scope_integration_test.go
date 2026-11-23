//go:build integration

package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/timeutil"
)

func TestConfiguredPeriodReadersUseFrozenRosterAndMonitoring(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)

	exec := func(query string, args ...any) {
		t.Helper()
		if _, err := tx.Exec(ctx, query, args...); err != nil {
			t.Fatal(err)
		}
	}
	monitoring := fixtureMonitoring(f)
	monitoring.ObservedAt = "2026-06-01"
	if err := insertRiskMonitoring(ctx, tx, monitoring); err != nil {
		t.Fatal(err)
	}
	exec(`UPDATE risk_monitorings SET status='final',
		draft_payload='{"observedScoreConfirmed":true}', finalized_at=now() WHERE id=$1`, monitoring.ID)
	paper := uuid.New()
	exec(`INSERT INTO working_papers(id,title,org_id,assessment_cycle,created_by,sequence_no,code,
		profile_version_id,monitoring_period_id,observation_cutoff)
		VALUES($1,'Period 1',$2,'2026-Q2',$3,1,$4,$5,$6,'2026-06-30')`, paper, f.org, f.actor, "WP-"+paper.String(), f.profile, f.period)
	exec(`UPDATE working_papers SET status='completed' WHERE id=$1`, paper)

	laterRisk := *f.risk
	laterRisk.ID = uuid.Nil
	laterRisk.Code = "NEW-" + uuid.NewString()
	laterRisk.VersionGroupID = uuid.New()
	laterRisk.Title = "Risk first applicable in period 2"
	laterRisk.AssessmentCycle = "2026-Q3"
	effective := time.Date(2026, time.July, 1, 0, 0, 0, 0, time.UTC)
	laterRisk.EffectiveFrom = &effective
	if err := (&riskRepository{pool: tx}).Create(ctx, &laterRisk); err != nil {
		t.Fatal(err)
	}

	revised := uuid.New()
	exec(`INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,previous_version_id,created_by,monitoring_rule_id,finalized_at)
		VALUES($1,$2,2026,2,$3,$4,$5,'2026-07-02T00:00:00+07')`, revised, f.org, f.profile, f.actor, f.rule)
	exec(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		VALUES($1,$2,$3,'2026-07-01','{}'),($1,$4,$5,'2026-07-01','{}')`, revised, f.risk.VersionGroupID, f.risk.ID, laterRisk.VersionGroupID, laterRisk.ID)
	exec(`SELECT set_config('manris.simulated_now','2026-07-02T00:00:00+07',true)`)

	progress, err := annualProfilePeriodProgress(ctx, tx, f.org, revised)
	if err != nil {
		t.Fatal(err)
	}
	if len(progress.Periods) != 2 {
		t.Fatalf("periods=%+v", progress.Periods)
	}
	first := progress.Periods[0]
	if first.ScopeProfileID == nil || *first.ScopeProfileID != f.profile || !first.ScopeLocked || first.WorkingPaper.Status != "done" {
		t.Fatalf("period 1 did not retain finalized profile and paper: %+v", first)
	}
	byGroup := make(map[uuid.UUID]RiskMonitoringPeriodProgress)
	for _, item := range first.Monitorings {
		byGroup[item.GroupID] = item
	}
	if old := byGroup[f.risk.VersionGroupID]; !old.Applicable || old.Status != "done" || old.ID == nil || *old.ID != monitoring.ID {
		t.Fatalf("period 1 monitoring changed: %+v", old)
	}
	if later, ok := byGroup[laterRisk.VersionGroupID]; !ok || later.Applicable {
		t.Fatalf("period 2 risk incorrectly applicable to period 1: %+v", later)
	}

	entries, _, err := scanRosterPreview(ctx, tx, f.org, rosterPeriod{ProfileID: &revised, PeriodID: &f.period, Cutoff: "2026-06-30", MonitoringCycle: "2026-Q2"})
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].SourceRiskID != f.risk.ID || entries[0].MonitoringID == nil || *entries[0].MonitoringID != monitoring.ID {
		t.Fatalf("KK roster lost frozen source or monitoring: %+v", entries)
	}

	start, end, err := entity.MonitoringPeriodCalendarBounds(2026, "semester", 1)
	if err != nil {
		t.Fatal(err)
	}
	period := repository.QuarterlyReportPeriod{Cycle: "Semester I", Start: start, End: end.AddDate(0, 0, 1), ProfileYear: 2026, RuleID: &f.rule, MonitoringPeriodID: &f.period}
	unit, err := loadUnitProgressRisks(ctx, tx, period, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if len(unit) != 1 || unit[0].ID != f.risk.ID || unit[0].MonitoringID == nil || *unit[0].MonitoringID != monitoring.ID {
		t.Fatalf("unit progress changed frozen roster: %+v", unit)
	}

	period.End = time.Date(2026, time.July, 1, 0, 0, 0, 0, timeutil.JakartaLocation())
	risks, _, err := loadQuarterlyRisks(ctx, tx, period.Cycle, period.Start, period.End, []uuid.UUID{f.org}, period)
	if err != nil {
		t.Fatal(err)
	}
	if len(risks) != 1 || risks[0].ID != f.risk.ID || risks[0].MonitoringObservedAt == nil || *risks[0].MonitoringObservedAt != monitoring.ObservedAt {
		t.Fatalf("period dashboard changed frozen roster/observation: %+v", risks)
	}
}
