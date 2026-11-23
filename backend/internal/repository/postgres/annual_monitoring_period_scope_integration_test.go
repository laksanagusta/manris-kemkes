//go:build integration

package postgres

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
)

func TestAnnualMonitoringPeriodScopePreservesFinalObservation(t *testing.T) {
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
	observation := fixtureMonitoring(f)
	observation.ObservedAt = "2026-06-01"
	if err := insertRiskMonitoring(ctx, tx, observation); err != nil {
		t.Fatal(err)
	}
	exec(`UPDATE risk_monitorings SET status='final', draft_payload='{"observedScoreConfirmed":true}', finalized_at='2026-07-01' WHERE id=$1`, observation.ID)

	v2 := uuid.New()
	exec(`INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,previous_version_id,created_by,monitoring_rule_id,finalized_at)
		VALUES($1,$2,2026,2,$3,$4,$5,'2026-07-01')`, v2, f.org, f.profile, f.actor, f.rule)
	exec(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		VALUES($1,$2,$3,'2026-06-15','{}')`, v2, f.risk.VersionGroupID, f.risk.ID)

	progress, err := annualProfilePeriodProgress(ctx, tx, f.org, v2)
	if err != nil {
		t.Fatal(err)
	}
	got := progress.Periods[0].Monitorings[0]
	if got.Status != "done" || got.ID == nil || *got.ID != observation.ID {
		t.Fatalf("expected existing final observation, got %+v", got)
	}

	rows, err := tx.Query(ctx, profileRosterQuery, f.org, v2, "2026-06-30", f.period)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	if !rows.Next() {
		t.Fatalf("expected roster member: %v", rows.Err())
	}
	var monitoringID *uuid.UUID
	targets := make([]any, len(rows.FieldDescriptions()))
	targets[5] = &monitoringID
	if err := rows.Scan(targets...); err != nil {
		t.Fatal(err)
	}
	if monitoringID == nil || *monitoringID != observation.ID {
		t.Fatalf("KK must use the same final observation as profile progress, got %v", monitoringID)
	}
}

func TestAnnualProfileRevisionRequiresExplicitCorrectionForLockedDates(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	paper := uuid.New()
	if _, err := tx.Exec(ctx, `INSERT INTO working_papers(id,title,org_id,assessment_cycle,created_by,sequence_no,code,
		profile_version_id,monitoring_period_id,observation_cutoff,status,completed_at)
		VALUES($1,'Periode 1',$2,'2026-Q2',$3,1,$4,$5,$6,'2026-06-30','completed','2026-07-01T00:00:00+07')`,
		paper, f.org, f.actor, "KK-"+paper.String(), f.profile, f.period); err != nil {
		t.Fatal(err)
	}
	createRisk := func(prefix string) entity.Risk {
		t.Helper()
		risk := *f.risk
		risk.ID, risk.VersionGroupID = uuid.Nil, uuid.New()
		risk.Code = prefix + uuid.NewString()
		if err := (&riskRepository{pool: tx}).Create(ctx, &risk); err != nil {
			t.Fatal(err)
		}
		return risk
	}
	nextPeriod := createRisk("NEXT-")
	historical := createRisk("HISTORY-")
	// The disposable integration DB keeps this fixture across API transactions.
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		// The rule can be archived without touching the finalized fixture.
		if _, err := pool.Exec(ctx, `UPDATE monitoring_rules SET active=false WHERE id=$1`, f.rule); err != nil {
			t.Errorf("archive fixture rule: %v", err)
		}
	})

	// Keep the submission clock deterministic across connections.
	cfg := pool.Config()
	cfg.ConnConfig.RuntimeParams["manris.simulated_now"] = "2026-07-02T00:00:00+07"
	workflowPool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer workflowPool.Close()
	workflow := NewUPRWorkflow(workflowPool)
	v2, err := workflow.CreateAnnualDraft(ctx, f.org, f.actor, 2026)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := workflow.SaveAnnualMember(ctx, f.org, f.actor, v2,
		AnnualMemberInput{RiskID: nextPeriod.ID, DeferAssessment: true}); err != nil {
		t.Fatal(err)
	}

	input := AnnualMemberInput{RiskID: historical.ID, EffectiveFrom: "2026-02-01", ChangeReason: "Risiko terlewat saat penyusunan dokumen."}
	if _, err := workflow.SaveAnnualMember(ctx, f.org, f.actor, v2, input); err == nil || !strings.Contains(err.Error(), "Semester I sudah terkunci") {
		t.Fatalf("ordinary edit must reject a locked period, got %v", err)
	}
	input.HistoricalCorrection = true
	if _, err := workflow.SaveAnnualMember(ctx, f.org, f.actor, v2, input); err != nil {
		t.Fatalf("deliberate correction should be recorded: %v", err)
	}
	if err := workflow.FinalizeAnnualProfile(ctx, f.org, f.actor, v2); err != nil {
		t.Fatal(err)
	}

	profile, err := workflow.AnnualProfile(ctx, f.org, 2026, v2)
	if err != nil {
		t.Fatal(err)
	}
	members := make(map[uuid.UUID]AnnualProfileMember)
	for _, member := range profile.Members {
		members[member.GroupID] = member
	}
	if got := members[nextPeriod.VersionGroupID]; got.EffectiveFrom != "2026-07-01" || got.HistoricalCorrection {
		t.Fatalf("ordinary pickup must start the first eligible period, got %+v", got)
	}
	if got := members[historical.VersionGroupID]; got.EffectiveFrom != input.EffectiveFrom || !got.HistoricalCorrection {
		t.Fatalf("explicit correction missing after finalization: %+v", got)
	}

	var anchor *uuid.UUID
	var memberCount int
	if err := workflowPool.QueryRow(ctx, `SELECT annual_monitoring_period_profile($1,$2),
		(SELECT count(*) FROM annual_monitoring_period_scope($1,$2))`, v2, f.period).Scan(&anchor, &memberCount); err != nil {
		t.Fatal(err)
	}
	if anchor == nil || *anchor != f.profile || memberCount != 1 {
		t.Fatalf("original period must stay linked to v1 and one original risk: %v, count=%d", anchor, memberCount)
	}
}

func TestAnnualRevisionWaitsForMonitoringPeriodCompletion(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	cfg := pool.Config()
	cfg.ConnConfig.RuntimeParams["manris.simulated_now"] = "2026-07-02T00:00:00+07"
	workflowPool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer workflowPool.Close()

	tx, err := workflowPool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	monitoring := fixtureMonitoring(f)
	secondRisk := *f.risk
	secondRisk.ID = uuid.Nil
	secondRisk.VersionGroupID = uuid.New()
	secondRisk.Code = "CONF-" + uuid.NewString()
	if err := (&riskRepository{pool: tx}).Create(ctx, &secondRisk); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline)
		VALUES($1,$2,$3,'2026-01-01','{}')`, f.profile, secondRisk.VersionGroupID, secondRisk.ID); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	archiveRevisionTestRule(t, pool, f.rule)
	exec := func(query string, args ...any) {
		t.Helper()
		if _, err := workflowPool.Exec(ctx, query, args...); err != nil {
			t.Fatal(err)
		}
	}

	workflow := NewUPRWorkflow(workflowPool)
	draft, err := workflow.CreateAnnualDraft(ctx, f.org, f.actor, 2026)
	if err != nil {
		t.Fatal(err)
	}
	if err := insertRiskMonitoring(ctx, workflowPool, monitoring); err != nil {
		t.Fatal(err)
	}
	newRisk := *f.risk
	newRisk.ID = uuid.Nil
	newRisk.VersionGroupID = uuid.New()
	newRisk.Code = "REV-" + uuid.NewString()
	if err := (&riskRepository{pool: workflowPool}).Create(ctx, &newRisk); err != nil {
		t.Fatal(err)
	}
	exec(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from)
		VALUES($1,$2,$3,'2026-06-25')`, draft, newRisk.VersionGroupID, newRisk.ID)
	assertBlocked := func() {
		t.Helper()
		if err := workflow.FinalizeAnnualProfile(ctx, f.org, f.actor, draft); err == nil ||
			!strings.Contains(err.Error(), "Selesaikan pemantauan Semester I") {
			t.Fatalf("expected unfinished period to block revision, got %v", err)
		}
	}
	assertBlocked()
	exec(`UPDATE risk_monitorings SET status='final',draft_payload='{"observedScoreConfirmed":true}',
		finalized_at=now() WHERE id=$1`, monitoring.ID)
	assertBlocked()
	paper := uuid.New()
	exec(`INSERT INTO working_papers(id,title,org_id,assessment_cycle,created_by,sequence_no,code,
		profile_version_id,monitoring_period_id,observation_cutoff,status,completed_at)
		VALUES($1,'Semester I',$2,'2026-Q2',$3,1,$4,$5,$6,'2026-06-30','completed','2026-07-02')`,
		paper, f.org, f.actor, "KK-"+paper.String(), f.profile, f.period)
	assertBlocked()
	template := uuid.New()
	exec(`INSERT INTO evaluation_templates(id,template_key,name,version) VALUES($1,$2,'Fixture',1)`, template, template.String())
	evaluation := uuid.New()
	exec(`INSERT INTO evaluations(id,organization_id,period,template_id,sequence_no,code,profile_version_id,monitoring_period_id)
		VALUES($1,$2,'2026-Q2',$3,1,$4,$5,$6)`,
		evaluation, f.org, template, "EV-"+evaluation.String(), f.profile, f.period)
	section := uuid.New()
	exec(`INSERT INTO evaluation_sections(id,evaluation_id,section_key,title,sort_order) VALUES($1,$2,'fixture','Fixture',1)`, section, evaluation)
	exec(`INSERT INTO evaluation_items(section_id,item_key,item_no,label,answer,sort_order) VALUES($1,'fixture','1','Fixture','yes',1)`, section)
	exec(`UPDATE evaluations SET status='final', finalized_at='2026-07-02' WHERE id=$1`, evaluation)
	assertBlocked()
	secondMonitoring := fixtureMonitoring(configuredFixture{actor: f.actor, profile: f.profile, period: f.period, risk: &secondRisk})
	if err := insertRiskMonitoring(ctx, workflowPool, secondMonitoring); err != nil {
		t.Fatal(err)
	}
	exec(`UPDATE risk_monitorings SET status='final',draft_payload='{"observedScoreConfirmed":true}',
		finalized_at=now() WHERE id=$1`, secondMonitoring.ID)
	if err := workflow.FinalizeAnnualProfile(ctx, f.org, f.actor, draft); err != nil {
		t.Fatalf("expected finished period to release revision: %v", err)
	}
	if _, err := workflow.CreateAnnualDraft(ctx, f.org, f.actor, 2026); err != nil {
		t.Fatalf("expected finished period to release draft creation: %v", err)
	}
	var effective string
	if err := workflowPool.QueryRow(ctx, `SELECT effective_from::text FROM annual_risk_profile_members
		WHERE profile_version_id=$1 AND version_group_id=$2`, draft, newRisk.VersionGroupID).Scan(&effective); err != nil || effective != "2026-07-02" {
		t.Fatalf("expected revision to apply beyond the completed scope, got %q, %v", effective, err)
	}
}

func TestAdministrativeClosureReleasesUnfinishedPeriodAfterWindow(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	monitoring := fixtureMonitoring(f)
	if err := insertRiskMonitoring(ctx, tx, monitoring); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	archiveRevisionTestRule(t, pool, f.rule)
	admin := &entity.AccessScope{UserID: f.actor, Role: entity.RoleSuperAdmin, IsGlobal: true}
	unit := &entity.AccessScope{UserID: f.actor, Role: entity.RoleUnit, AccessibleOrgIDs: []uuid.UUID{f.org}}
	reason := "Dokumentasikan pekerjaan yang belum selesai."
	workflowAt := func(at string) *UPRWorkflow {
		t.Helper()
		cfg := pool.Config()
		cfg.ConnConfig.RuntimeParams["manris.simulated_now"] = at
		timedPool, err := pgxpool.NewWithConfig(ctx, cfg)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(timedPool.Close)
		return NewUPRWorkflow(timedPool)
	}
	open := workflowAt("2026-07-02T00:00:00+07")
	if err := open.ApproveAnnualMonitoringPeriodClosure(ctx, admin, f.profile, f.period, reason); err == nil {
		t.Fatal("an open period must not be closed administratively")
	}

	closed := workflowAt("2026-08-01T00:00:00+07")
	for _, workflow := range []*UPRWorkflow{open, closed} {
		if _, err := workflow.CreateAnnualDraft(ctx, f.org, f.actor, 2026); err == nil ||
			!strings.Contains(err.Error(), "sebelum membuat draf revisi") {
			t.Fatalf("expected unfinished period to block draft creation: %v", err)
		}
	}
	visible, err := closed.AnnualProfileList(ctx, admin, uuid.Nil, true)
	if err != nil {
		t.Fatal(err)
	}
	var found bool
	for _, version := range visible {
		found = found || version.ID == f.profile
	}
	if !found {
		t.Fatal("Super Admin without a home organization must be able to find the profile")
	}
	read, err := closed.AnnualProfileForScope(ctx, admin, uuid.Nil, 2026, f.profile)
	if err != nil || read.Selected == nil || read.Selected.ID != f.profile {
		t.Fatalf("Super Admin must be able to open the profile: %v", err)
	}
	if err := closed.ApproveAnnualMonitoringPeriodClosure(ctx, unit, f.profile, f.period, reason); err == nil {
		t.Fatal("a unit user must not approve administrative closure")
	}
	if err := closed.ApproveAnnualMonitoringPeriodClosure(ctx, admin, f.profile, f.period, "  "); err == nil {
		t.Fatal("administrative closure requires a reason")
	}
	if err := closed.ApproveAnnualMonitoringPeriodClosure(ctx, admin, f.profile, f.period, reason); err != nil {
		t.Fatal(err)
	}
	draft, err := closed.CreateAnnualDraft(ctx, f.org, f.actor, 2026)
	if err != nil {
		t.Fatalf("administrative closure must release draft creation: %v", err)
	}
	if err := closed.FinalizeAnnualProfile(ctx, f.org, f.actor, draft); err != nil {
		t.Fatalf("administrative closure must release the revision: %v", err)
	}
	var status, recordedReason string
	var approvedBy uuid.UUID
	if err := pool.QueryRow(ctx, `SELECT rm.status, c.approval_reason, c.approved_by
		FROM risk_monitorings rm JOIN annual_monitoring_period_completion c ON c.monitoring_period_id=rm.monitoring_period_id
		WHERE rm.id=$1`, monitoring.ID).Scan(&status, &recordedReason, &approvedBy); err != nil {
		t.Fatal(err)
	}
	if status != "draft" || recordedReason != reason || approvedBy != admin.UserID {
		t.Fatalf("expected draft monitoring and recorded approval, got %q, %q, %s", status, recordedReason, approvedBy)
	}
}

func archiveRevisionTestRule(t *testing.T, pool *pgxpool.Pool, rule uuid.UUID) {
	t.Helper()
	t.Cleanup(func() {
		if _, err := pool.Exec(context.Background(), `UPDATE monitoring_rules SET active=false WHERE id=$1`, rule); err != nil {
			t.Errorf("archive fixture rule: %v", err)
		}
	})
}
