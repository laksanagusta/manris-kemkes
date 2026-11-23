//go:build integration

package postgres

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
)

func TestAnnualProfileExclusionPreservesEarlierCoverage(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	remaining := *f.risk
	remaining.ID, remaining.VersionGroupID = uuid.Nil, uuid.New()
	remaining.Code = "KEEP-" + uuid.NewString()
	if err := (&riskRepository{pool: tx}).Create(ctx, &remaining); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_members
		(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		VALUES($1,$2,$3,'2026-01-01','{}')`, f.profile, remaining.VersionGroupID, remaining.ID); err != nil {
		t.Fatal(err)
	}
	draft := uuid.New()
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_versions
		(id,organization_id,year,version,previous_version_id,created_by,monitoring_rule_id)
		VALUES($1,$2,2026,2,$3,$4,$5)`, draft, f.org, f.profile, f.actor, f.rule); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_members
		(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		SELECT $1,version_group_id,risk_id,effective_from,baseline
		FROM annual_risk_profile_members WHERE profile_version_id=$2`, draft, f.profile); err != nil {
		t.Fatal(err)
	}
	observation := fixtureMonitoring(f)
	if err := insertRiskMonitoring(ctx, tx, observation); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE risk_monitorings SET status='final',
		draft_payload='{"observedScoreConfirmed":true}', finalized_at='2026-07-01' WHERE id=$1`, observation.ID); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := pool.Exec(ctx, `UPDATE monitoring_rules SET active=false WHERE id=$1`, f.rule); err != nil {
			t.Errorf("archive fixture rule: %v", err)
		}
	})
	cfg := pool.Config()
	cfg.ConnConfig.RuntimeParams["manris.simulated_now"] = "2026-04-01T00:00:00+07"
	workflowPool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer workflowPool.Close()
	workflow := NewUPRWorkflow(workflowPool)
	input := AnnualMemberExclusionInput{ChangeReason: "Kegiatan tidak lagi menjadi lingkup unit."}
	if err := workflow.ExcludeAnnualMember(ctx, f.org, f.actor, draft, f.risk.VersionGroupID, input); err != nil {
		t.Fatal(err)
	}
	profile, err := workflow.AnnualProfile(ctx, f.org, 2026, draft)
	if err != nil || len(profile.Members) != 1 || len(profile.Exclusions) != 1 || profile.Exclusions[0].EffectiveFrom != nil || profile.Exclusions[0].ChangeReason != input.ChangeReason {
		t.Fatalf("expected one retained member and one exclusion, got %+v, %v", profile, err)
	}
	if err := workflow.CancelAnnualMemberExclusion(ctx, f.org, draft, f.risk.VersionGroupID); err != nil {
		t.Fatal(err)
	}
	profile, err = workflow.AnnualProfile(ctx, f.org, 2026, draft)
	if err != nil || len(profile.Members) != 2 || len(profile.Exclusions) != 0 {
		t.Fatalf("undo must restore original membership, got %+v, %v", profile, err)
	}
	for _, member := range profile.Members {
		if !member.CanRemove || !member.FromPreviousVersion {
			t.Fatalf("inherited draft member must offer dated removal: %+v", member)
		}
	}
	if err := workflow.ExcludeAnnualMember(ctx, f.org, f.actor, draft, f.risk.VersionGroupID, input); err != nil {
		t.Fatal(err)
	}
	if err := workflow.FinalizeAnnualProfile(ctx, f.org, f.actor, draft); err == nil || !strings.Contains(err.Error(), "Selesaikan pemantauan Semester I") {
		t.Fatalf("unfinished monitoring must block the revision, got %v", err)
	}
	profile, err = workflow.AnnualProfile(ctx, f.org, 2026, draft)
	if err != nil || len(profile.Exclusions) != 1 || profile.Exclusions[0].EffectiveFrom != nil {
		t.Fatalf("failed finalization must leave the exclusion undated, got %+v, %v", profile, err)
	}

	// The same draft is finalized later, on September 1 in Jakarta but August 31 UTC.
	cfg = pool.Config()
	cfg.ConnConfig.RuntimeParams["manris.simulated_now"] = "2026-08-31T17:00:00Z"
	finalizationPool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer finalizationPool.Close()
	workflow = NewUPRWorkflow(finalizationPool)
	admin := &entity.AccessScope{UserID: f.actor, Role: entity.RoleSuperAdmin, IsGlobal: true}
	if err := workflow.ApproveAnnualMonitoringPeriodClosure(ctx, admin, draft, f.period, "Dokumentasikan periode yang belum lengkap."); err != nil {
		t.Fatal(err)
	}
	if err := workflow.FinalizeAnnualProfile(ctx, f.org, f.actor, draft); err != nil {
		t.Fatal(err)
	}
	profile, err = workflow.AnnualProfile(ctx, f.org, 2026, draft)
	if err != nil || len(profile.Exclusions) != 1 || profile.Exclusions[0].EffectiveFrom == nil || *profile.Exclusions[0].EffectiveFrom != "2026-09-01" {
		t.Fatalf("expected the finalization date in WIB, got %+v, %v", profile, err)
	}
	assertScope := func(t *testing.T, profileID uuid.UUID, cutoff string, want bool) {
		t.Helper()
		var exists bool
		err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_monitoring_members_as_of($1,$2::date)
			WHERE version_group_id=$3)`, profileID, cutoff, f.risk.VersionGroupID).Scan(&exists)
		if err != nil || exists != want {
			t.Fatalf("profile %s effective %s membership = %v, want %v, err %v", profileID, cutoff, exists, want, err)
		}
	}
	assertScope(t, f.profile, "2026-12-31", true)
	assertScope(t, draft, "2026-08-31", true)
	assertScope(t, draft, "2026-09-01", false)
	periods, err := annualProfilePeriodProgress(ctx, finalizationPool, f.org, draft)
	if err != nil {
		t.Fatal(err)
	}
	if len(periods.Periods) != 2 || !periods.Periods[0].ScopeLocked {
		t.Fatalf("expected the first period to stay frozen: %+v", periods)
	}
	for _, period := range periods.Periods {
		var inScope bool
		if err := finalizationPool.QueryRow(ctx, `SELECT EXISTS (
			SELECT 1 FROM annual_monitoring_period_scope($1,$2) WHERE version_group_id=$3
		)`, draft, period.ID, f.risk.VersionGroupID).Scan(&inScope); err != nil || inScope != (period.ID == f.period) {
			t.Fatalf("risk appears in %s = %v, err %v", period.Label, inScope, err)
		}
	}
	if err := workflow.CancelAnnualMemberExclusion(ctx, f.org, draft, f.risk.VersionGroupID); err == nil {
		t.Fatal("finalized exclusion must be immutable")
	}
	var preserved bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM risk_monitorings WHERE id=$1 AND source_risk_id=$2)`, observation.ID, f.risk.ID).Scan(&preserved); err != nil || !preserved {
		t.Fatalf("expected prior monitoring and risk to remain, got %v, %v", preserved, err)
	}
	next, err := workflow.CreateAnnualDraft(ctx, f.org, f.actor, 2026)
	if err != nil {
		t.Fatal(err)
	}
	readd := AnnualMemberInput{RiskID: f.risk.ID, EffectiveFrom: "2026-09-01"}
	if _, err := workflow.SaveAnnualMember(ctx, f.org, f.actor, next, readd); err == nil {
		t.Fatal("re-adding on the exclusion date erases the exclusion interval")
	}
	readd.EffectiveFrom = ""
	if _, err := workflow.SaveAnnualMember(ctx, f.org, f.actor, next, readd); err != nil {
		t.Fatal(err)
	}
	if err := workflow.FinalizeAnnualProfile(ctx, f.org, f.actor, next); err != nil {
		t.Fatal(err)
	}
	readdDate := max(defaultAnnualMemberDate(2026, timeutil.BusinessNow().In(timeutil.JakartaLocation())), "2026-09-02")
	readdedOn, err := time.Parse(time.DateOnly, readdDate)
	if err != nil {
		t.Fatal(err)
	}
	assertScope(t, next, readdedOn.AddDate(0, 0, -1).Format(time.DateOnly), false)
	assertScope(t, next, readdDate, true)

	t.Run("revision finalized before the profile year", func(t *testing.T) {
		prior := uuid.New()
		if _, err := finalizationPool.Exec(ctx, `INSERT INTO annual_risk_profile_versions
			(id,organization_id,year,version,created_by,finalized_at,finalized_by)
			VALUES($1,$2,2027,1,$3,'2026-08-01',$3)`, prior, f.org, f.actor); err != nil {
			t.Fatal(err)
		}
		if _, err := finalizationPool.Exec(ctx, `INSERT INTO annual_risk_profile_members
			(profile_version_id,version_group_id,risk_id,effective_from,baseline)
			VALUES($1,$2,$3,'2027-01-01','{}'),($1,$4,$5,'2027-01-01','{}')`,
			prior, f.risk.VersionGroupID, f.risk.ID, remaining.VersionGroupID, remaining.ID); err != nil {
			t.Fatal(err)
		}
		revision, err := workflow.CreateAnnualDraft(ctx, f.org, f.actor, 2027)
		if err != nil {
			t.Fatal(err)
		}
		if err := workflow.ExcludeAnnualMember(ctx, f.org, f.actor, revision, f.risk.VersionGroupID, input); err != nil {
			t.Fatal(err)
		}
		if err := workflow.FinalizeAnnualProfile(ctx, f.org, f.actor, revision); err != nil {
			t.Fatalf("a future profile must be finalizable with an exclusion: %v", err)
		}
		got, err := workflow.AnnualProfile(ctx, f.org, 2027, revision)
		if err != nil || got.Selected == nil || got.Selected.FinalizedAt == nil ||
			got.Selected.FinalizedAt.In(timeutil.JakartaLocation()).Format(time.DateOnly) != "2026-09-01" ||
			len(got.Exclusions) != 1 || got.Exclusions[0].EffectiveFrom == nil || *got.Exclusions[0].EffectiveFrom != "2027-01-01" {
			t.Fatalf("expected a 2026 finalization and a 2027 exclusion: %+v, %v", got, err)
		}
		assertScope(t, prior, "2027-01-01", true)
		assertScope(t, revision, "2027-01-01", false)
	})
}
