//go:build integration

package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestAnnualProfileProgressReportUsesSelectedFinalVersion(t *testing.T) {
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
	exec(`UPDATE annual_risk_profile_members SET baseline='{"value":12.5,"weight":1.6,"target_nilai":7.2}'
		WHERE profile_version_id=$1`, f.profile)
	observation := fixtureMonitoring(f)
	if err := insertRiskMonitoring(ctx, tx, observation); err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC)
	access := &entity.AccessScope{AccessibleOrgIDs: []uuid.UUID{f.org}}
	draft, err := readAnnualProfileProgressReport(ctx, tx, access, f.profile, false, now)
	if err != nil || len(draft.Periods) != 0 || len(draft.Baseline) != 1 {
		t.Fatalf("draft observation should leave only the baseline: %+v, %v", draft, err)
	}
	exec(`UPDATE risk_monitorings SET status='final', observed_nilai=8, observed_weight=1.4,
		draft_payload='{"observedScoreConfirmed":true}', finalized_at='2026-07-01' WHERE id=$1`, observation.ID)

	v2 := uuid.New()
	exec(`INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,previous_version_id,created_by,monitoring_rule_id,finalized_at)
		VALUES($1,$2,2026,2,$3,$4,$5,'2026-07-01')`, v2, f.org, f.profile, f.actor, f.rule)
	exec(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		VALUES($1,$2,$3,'2026-07-01','{"value":18}')`, v2, f.risk.VersionGroupID, f.risk.ID)

	got, err := readAnnualProfileProgressReport(ctx, tx, access, f.profile, true, now)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Baseline) != 1 || got.Baseline[0].Score == nil || *got.Baseline[0].Score != 12.5 {
		t.Fatalf("unexpected baseline from selected version: %+v", got.Baseline)
	}
	if len(got.Periods) != 1 || got.Periods[0].ID != f.period || len(got.Periods[0].Risks) != 1 {
		t.Fatalf("expected one period with a Final observation, got %+v", got.Periods)
	}
	risk := got.Periods[0].Risks[0]
	if risk.Score == nil || *risk.Score != 8 || risk.Target == nil || *risk.Target != 7.2 {
		t.Fatalf("unexpected observation or frozen target: %+v", risk)
	}
	if got.Latest == nil || len(got.Latest.Organizations) != 1 || got.Latest.Organizations[0].ID != f.org {
		t.Fatalf("export should use only the selected profile's organization: %+v", got.Latest)
	}
	_, err = readAnnualProfileProgressReport(ctx, tx, &entity.AccessScope{}, f.profile, true, now)
	if !errors.Is(err, ErrUPRNotFound) {
		t.Fatalf("out-of-scope profile must be hidden, got %v", err)
	}
}

func TestMonitoringRuleProgressAggregatesReadableUnits(t *testing.T) {
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
	exec(`UPDATE annual_risk_profile_members SET baseline='{"value":11}'
		WHERE profile_version_id=$1`, f.profile)
	v2 := uuid.New()
	exec(`INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,previous_version_id,created_by,monitoring_rule_id,finalized_at)
		VALUES($1,$2,2026,2,$3,$4,$5,'2026-02-01')`, v2, f.org, f.profile, f.actor, f.rule)
	exec(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		VALUES($1,$2,$3,'2026-02-01','{"value":15,"target_nilai":6}')`, v2, f.risk.VersionGroupID, f.risk.ID)

	otherOrg, otherActor, otherProfile := uuid.New(), uuid.New(), uuid.New()
	exec(`INSERT INTO organizations(id,name) VALUES($1,'Second unit fixture')`, otherOrg)
	exec(`INSERT INTO users(id,name,username,email,password_hash,role,organization_id)
		VALUES($1,'Second actor',$2,$3,'test','unit',$4)`, otherActor, "actor-"+otherActor.String(), otherActor.String()+"@example.test", otherOrg)
	risk := *f.risk
	risk.ID, risk.VersionGroupID = uuid.Nil, uuid.New()
	risk.Code, risk.OrganizationID, risk.CreatedBy = "OTHER-"+uuid.NewString(), &otherOrg, &otherActor
	if err := (&riskRepository{pool: tx}).Create(ctx, &risk); err != nil {
		t.Fatal(err)
	}
	exec(`INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,created_by,monitoring_rule_id,finalized_at)
		VALUES($1,$2,2026,1,$3,$4,'2026-01-01')`, otherProfile, otherOrg, otherActor, f.rule)
	exec(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		VALUES($1,$2,$3,'2026-01-01','{"value":7,"target_nilai":4}')`, otherProfile, risk.VersionGroupID, risk.ID)

	for _, input := range []configuredFixture{
		{org: f.org, actor: f.actor, profile: v2, period: f.period, risk: f.risk},
		{org: otherOrg, actor: otherActor, profile: otherProfile, period: f.period, risk: &risk},
	} {
		observation := fixtureMonitoring(input)
		if err := insertRiskMonitoring(ctx, tx, observation); err != nil {
			t.Fatal(err)
		}
		exec(`UPDATE risk_monitorings SET status='final', observed_nilai=5,
			draft_payload='{"observedScoreConfirmed":true}', finalized_at='2026-07-01' WHERE id=$1`, observation.ID)
	}

	now := time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC)
	access := &entity.AccessScope{AccessibleOrgIDs: []uuid.UUID{f.org, otherOrg}}
	rules, err := readMonitoringRuleProgressOptions(ctx, tx, access)
	if err != nil || len(rules) != 1 || rules[0].ID != f.rule || len(rules[0].Organizations) != 2 {
		t.Fatalf("expected the shared rule, got %+v, %v", rules, err)
	}
	report, err := readMonitoringRuleProgressReport(ctx, tx, access, f.rule, nil, true, now)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Organizations) != 2 || len(report.Baseline) != 2 || len(report.Periods) != 1 ||
		report.Periods[0].TotalRisks != 2 || len(report.Periods[0].Risks) != 2 ||
		report.Latest == nil || len(report.Latest.Organizations) != 2 {
		t.Fatalf("expected two units in one set of periods and export, got %+v", report)
	}
	for _, baseline := range report.Baseline {
		if baseline.GroupID == f.risk.VersionGroupID && (baseline.Score == nil || *baseline.Score != 15) {
			t.Fatalf("expected only the latest Final baseline for the first unit, got %+v", baseline)
		}
	}

	restricted := &entity.AccessScope{AccessibleOrgIDs: []uuid.UUID{otherOrg}}
	limited, err := readMonitoringRuleProgressReport(ctx, tx, restricted, f.rule, nil, true, now)
	if err != nil || len(limited.Organizations) != 1 || limited.Organizations[0].ID != otherOrg ||
		len(limited.Baseline) != 1 || len(limited.Periods) != 1 || limited.Periods[0].TotalRisks != 1 ||
		limited.Latest == nil || len(limited.Latest.Organizations) != 1 {
		t.Fatalf("restricted report must contain only the authorized organization, got %+v, %v", limited, err)
	}
	picked, err := readMonitoringRuleProgressReport(ctx, tx, access, f.rule, []uuid.UUID{otherOrg}, true, now)
	if err != nil || len(picked.Organizations) != 1 || picked.Organizations[0].ID != otherOrg ||
		len(picked.Baseline) != 1 || len(picked.Periods) != 1 || picked.Periods[0].TotalRisks != 1 ||
		picked.Latest == nil || len(picked.Latest.Organizations) != 1 || picked.Latest.Organizations[0].ID != otherOrg {
		t.Fatalf("selected unit must scope both charts and export, got %+v, %v", picked, err)
	}
	if opts, err := readMonitoringRuleProgressOptions(ctx, tx, restricted); err != nil || len(opts) != 1 ||
		len(opts[0].Organizations) != 1 || opts[0].Organizations[0].ID != otherOrg {
		t.Fatalf("unit options must follow read access, got %+v, %v", opts, err)
	}
	if _, err := readMonitoringRuleProgressReport(ctx, tx, restricted, f.rule, []uuid.UUID{otherOrg, f.org}, true, now); err == nil {
		t.Fatal("a selection including an unauthorized unit must be rejected")
	}

	noAccess := &entity.AccessScope{}
	if rules, err := readMonitoringRuleProgressOptions(ctx, tx, noAccess); err != nil || len(rules) != 0 {
		t.Fatalf("scope without organizations must have no rules, got %+v, %v", rules, err)
	}
	if _, err := readMonitoringRuleProgressReport(ctx, tx, noAccess, f.rule, nil, false, now); !errors.Is(err, ErrUPRNotFound) {
		t.Fatalf("scope without organizations must not read a global report, got %v", err)
	}
}
