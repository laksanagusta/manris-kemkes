//go:build integration

package postgres

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
)

type configuredFixture struct {
	org, actor, rule, period, profile uuid.UUID
	risk                              *entity.Risk
}

func configuredTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("CONFIGURED_MONITORING_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires isolated database migrated through88")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}
func seedConfiguredFixture(t *testing.T, ctx context.Context, tx pgx.Tx) configuredFixture {
	t.Helper()
	f := configuredFixture{org: uuid.New(), actor: uuid.New(), rule: uuid.New(), period: uuid.New(), profile: uuid.New()}
	_, err := tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-07-01T00:00:00+07',true)`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Configured period fixture')`, f.org); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,organization_id) VALUES($1,'Period actor',$2,$3,'test','unit',$4)`, f.actor, "period-"+f.actor.String(), f.actor.String()+"@example.test", f.org); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO monitoring_rules(id,name,year,frequency) VALUES($1,'Semester windows',2026,'semester')`, f.rule); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO monitoring_rule_periods(id,rule_id,label,ordinal,opens_on,closes_on) VALUES($1,$2,'Semester I',1,'2026-07-01','2026-07-31'),($3,$2,'Semester II',2,'2027-01-01','2027-01-31')`, f.period, f.rule, uuid.New()); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `SET CONSTRAINTS ALL IMMEDIATE`); err != nil {
		t.Fatal(err)
	}
	effective := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	f.risk = &entity.Risk{Code: "CONF-" + uuid.NewString(), Title: "Configured observation", Category: entity.RiskCategoryOperasional, Status: "final", VersionGroupID: uuid.New(), OrganizationID: &f.org, CreatedBy: &f.actor, IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q1", Probability: 3, Impact: 3, TargetProbability: 1, TargetImpact: 1, EffectiveFrom: &effective}
	if err := (&riskRepository{pool: tx}).Create(ctx, f.risk); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,created_by,monitoring_rule_id,finalized_by,finalized_at) VALUES($1,$2,2026,1,$3,$4,$3,'2026-01-01')`, f.profile, f.org, f.actor, f.rule); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline) VALUES($1,$2,$3,'2026-01-01','{}')`, f.profile, f.risk.VersionGroupID, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	return f
}
func fixtureMonitoring(f configuredFixture) *entity.RiskMonitoring {
	m := entity.NewRiskMonitoringDraft(f.risk, "2026-Q2", f.actor)
	m.ProfileVersionID = &f.profile
	m.MonitoringPeriodID = &f.period
	m.ObservedAt = "2026-06-30"
	return m
}
func expectConfiguredDBError(t *testing.T, ctx context.Context, tx pgx.Tx, sql string, args ...any) {
	t.Helper()
	if _, err := tx.Exec(ctx, `SAVEPOINT invalid_write`); err != nil {
		t.Fatal(err)
	}
	_, err := tx.Exec(ctx, sql, args...)
	if err == nil {
		t.Fatalf("expected rejected write: %s", sql)
	}
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || (pgErr.Code != "23514" && pgErr.Code != "23505") {
		t.Fatalf("unexpected rejection: %v", err)
	}
	if _, err := tx.Exec(ctx, `ROLLBACK TO SAVEPOINT invalid_write`); err != nil {
		t.Fatal(err)
	}
}
func TestConfiguredMonitoringDBBoundsAndProfileIntegrity(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	for _, tt := range []struct {
		name, at string
		valid    bool
	}{{"before Jakarta opening", "2026-06-30T16:59:59Z", false}, {"exact opening", "2026-06-30T17:00:00Z", true}, {"last closing instant", "2026-07-31T16:59:59Z", true}, {"after close", "2026-07-31T17:00:00Z", false}} {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := tx.Exec(ctx, `SELECT set_config('manris.simulated_now',$1,true)`, tt.at); err != nil {
				t.Fatal(err)
			}
			if tt.valid {
				if err := assertConfiguredPeriod(ctx, tx, f.profile, f.period, f.org); err != nil {
					t.Fatal(err)
				}
			} else {
				expectConfiguredDBError(t, ctx, tx, `SELECT assert_monitoring_period_open($1,$2,$3)`, f.profile, f.period, f.org)
			}
		})
	}
	if _, err := tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-07-01T00:00:00+07',true)`); err != nil {
		t.Fatal(err)
	}
	expectConfiguredDBError(t, ctx, tx, `SELECT assert_monitoring_period_open($1,$2,$3)`, f.profile, f.period, uuid.New())
	expectConfiguredDBError(t, ctx, tx, `INSERT INTO annual_risk_profile_versions(organization_id,year,version,created_by,monitoring_rule_id) VALUES($1,2027,1,$2,$3)`, f.org, f.actor, f.rule)
	expectConfiguredDBError(t, ctx, tx, `UPDATE monitoring_rule_periods SET closes_on='2026-08-01' WHERE id=$1`, f.period)
	expectConfiguredDBError(t, ctx, tx, `UPDATE annual_risk_profile_versions SET monitoring_rule_id=NULL WHERE id=$1`, f.profile)
	expectConfiguredDBError(t, ctx, tx, `INSERT INTO monitoring_rule_periods(rule_id,label,ordinal,opens_on,closes_on) VALUES($1,'Extra',3,'2027-02-01','2027-02-02')`, f.rule)
	m := fixtureMonitoring(f)
	if err := insertRiskMonitoring(ctx, tx, m); err != nil {
		t.Fatal(err)
	}
	expectConfiguredDBError(t, ctx, tx, `UPDATE risk_monitorings SET observed_at='2026-07-01' WHERE id=$1`, m.ID)
	expectConfiguredDBError(t, ctx, tx, `UPDATE risk_monitorings SET status='final' WHERE id=$1`, m.ID)
	expectConfiguredDBError(t, ctx, tx, `UPDATE risk_monitorings SET profile_version_id=NULL,monitoring_period_id=NULL WHERE id=$1`, m.ID)
	// Calendar coverage belongs to semester I even though submission opens in July.
	var covers bool
	if err := tx.QueryRow(ctx, `SELECT monitoring_observation_in_period($1,$2,'2026-06-30')`, f.profile, f.period).Scan(&covers); err != nil || !covers {
		t.Fatalf("coverage=%v %v", covers, err)
	}
	if _, err := tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-08-01T00:00:00+07',true)`); err != nil {
		t.Fatal(err)
	}
	expectConfiguredDBError(t, ctx, tx, `UPDATE risk_monitorings SET conclusion='late' WHERE id=$1`, m.ID)
	expectConfiguredDBError(t, ctx, tx, `DELETE FROM risk_monitorings WHERE id=$1`, m.ID)
}
func TestConfiguredMonitoringDBRevisionAndLegacy(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	m := fixtureMonitoring(f)
	if err := insertRiskMonitoring(ctx, tx, m); err != nil {
		t.Fatal(err)
	}
	revised := uuid.New()
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,previous_version_id,created_by,monitoring_rule_id,finalized_at) VALUES($1,$2,2026,2,$3,$4,$5,'2026-07-01')`, revised, f.org, f.profile, f.actor, f.rule); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_members SELECT $1,version_group_id,risk_id,source_risk_id,objective_id,effective_from,change_reason,baseline FROM annual_risk_profile_members WHERE profile_version_id=$2`, revised, f.profile); err != nil {
		t.Fatal(err)
	}
	expectConfiguredDBError(t, ctx, tx, `INSERT INTO risk_monitorings(source_risk_id,version_group_id,assessment_cycle,status,mode,source_probability,source_impact,observed_probability,observed_impact,observed_at,profile_version_id,monitoring_period_id) VALUES($1,$2,'2026-Q2','draft','score_only',3,3,3,3,'2026-06-30',$3,$4)`, f.risk.ID, f.risk.VersionGroupID, revised, f.period)
	// Legacy document writes stay available without fabricated profile associations.
	legacy := *f.risk
	legacy.ID = uuid.Nil
	legacy.VersionGroupID = uuid.New()
	legacy.Code = "LEG-" + uuid.NewString()
	if err := (&riskRepository{pool: tx}).Create(ctx, &legacy); err != nil {
		t.Fatal(err)
	}
	lm := entity.NewRiskMonitoringDraft(&legacy, "2026-Q2", f.actor)
	lm.ObservedAt = "2026-06-30"
	if err := insertRiskMonitoring(ctx, tx, lm); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-08-01T00:00:00+07',true)`); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE risk_monitorings SET conclusion='legacy edit' WHERE id=$1`, lm.ID); err != nil {
		t.Fatal(err)
	}
	// Generic starts on a configured family cannot use the legacy route.
	expectConfiguredDBError(t, ctx, tx, `INSERT INTO risk_monitorings(source_risk_id,version_group_id,assessment_cycle,status,mode,source_probability,source_impact,observed_probability,observed_impact,observed_at) VALUES($1,$2,'2026-Q2','draft','score_only',3,3,3,3,'2026-06-30')`, f.risk.ID, f.risk.VersionGroupID)
}
func TestConfiguredMonitoringDuplicateRace(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// This test commits the fixture to exercise concurrent connections.
	// Suppress initial history for this fixture so teardown can delete its risk.
	if _, err := tx.Exec(ctx, "ALTER TABLE risks DISABLE TRIGGER risk_initial_assessment"); err != nil {
		t.Fatal(err)
	}
	f := seedConfiguredFixture(t, ctx, tx)
	if _, err := tx.Exec(ctx, "ALTER TABLE risks ENABLE TRIGGER risk_initial_assessment"); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	defer func() {
		tx, err := pool.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback(ctx)
		if _, err := tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-07-01T00:00:00+07',true)`); err != nil {
			t.Fatal(err)
		}
		for _, q := range []string{`DELETE FROM risk_monitorings WHERE profile_version_id=$1`, `DELETE FROM annual_risk_profile_members WHERE profile_version_id=$1`, `DELETE FROM annual_risk_profile_versions WHERE id=$1`} {
			if _, err := tx.Exec(ctx, q, f.profile); err != nil {
				t.Fatal(err)
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM risks WHERE id=$1`, f.risk.ID); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM users WHERE id=$1`, f.actor); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM organizations WHERE id=$1`, f.org); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM monitoring_rules WHERE id=$1`, f.rule); err != nil {
			t.Fatal(err)
		}
		if err := tx.Commit(ctx); err != nil {
			t.Fatal(err)
		}
	}()
	start := make(chan struct{})
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tx, err := pool.Begin(ctx)
			if err != nil {
				results <- err
				return
			}
			defer tx.Rollback(ctx)
			if _, err = tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-07-01T00:00:00+07',true)`); err != nil {
				results <- err
				return
			}
			<-start
			m := fixtureMonitoring(f)
			err = insertRiskMonitoring(ctx, tx, m)
			if err == nil {
				err = tx.Commit(ctx)
			}
			results <- err
		}()
	}
	close(start)
	wg.Wait()
	close(results)
	success, conflicts := 0, 0
	for err := range results {
		if err == nil {
			success++
			continue
		}
		var p *pgconn.PgError
		if errors.As(err, &p) && p.Code == "23505" {
			conflicts++
		} else {
			t.Fatal(err)
		}
	}
	if success != 1 || conflicts != 1 {
		t.Fatalf("success=%d conflicts=%d", success, conflicts)
	}
}

func TestConfiguredDocumentsUniquenessAndFinality(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := tx.Exec(ctx, q, args...); err != nil {
			t.Fatal(err)
		}
	}
	template, eval, section, item, wp := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	exec(`INSERT INTO evaluation_templates(id,template_key,name,version,status) VALUES($1,$2,'Test',1,'active')`, template, template.String())
	evalSQL := `INSERT INTO evaluations(id,organization_id,period,template_id,sequence_no,code,profile_version_id,monitoring_period_id) VALUES($1,$2,'2026-H1',$3,$4,$5,$6,$7)`
	exec(evalSQL, eval, f.org, template, 1, "E-"+eval.String(), f.profile, f.period)
	expectConfiguredDBError(t, ctx, tx, evalSQL, uuid.New(), f.org, template, 2, "E-duplicate", f.profile, f.period)
	exec(`INSERT INTO evaluation_sections(id,evaluation_id,section_key,title,sort_order) VALUES($1,$2,'test','Test',1)`, section, eval)
	exec(`INSERT INTO evaluation_items(id,section_id,item_key,item_no,label,sort_order) VALUES($1,$2,'test','1','Test',1)`, item, section)
	expectConfiguredDBError(t, ctx, tx, `UPDATE evaluations SET status='final' WHERE id=$1`, eval)
	exec(`UPDATE evaluation_items SET answer='yes' WHERE id=$1`, item)
	exec(`UPDATE evaluations SET status='final' WHERE id=$1`, eval)
	expectConfiguredDBError(t, ctx, tx, `UPDATE evaluations SET status='draft' WHERE id=$1`, eval)
	expectConfiguredDBError(t, ctx, tx, `UPDATE evaluation_items SET answer='no' WHERE id=$1`, item)
	wpSQL := `INSERT INTO working_papers(id,title,org_id,assessment_cycle,created_by,sequence_no,code,profile_version_id,monitoring_period_id,observation_cutoff) VALUES($1,'Test',$2,'2026-Q2',$3,$4,$5,$6,$7,'2026-06-30')`
	exec(wpSQL, wp, f.org, f.actor, 1, "W-"+wp.String(), f.profile, f.period)
	expectConfiguredDBError(t, ctx, tx, wpSQL, uuid.New(), f.org, f.actor, 2, "W-duplicate", f.profile, f.period)
	exec(`UPDATE working_papers SET status='completed' WHERE id=$1`, wp)
	expectConfiguredDBError(t, ctx, tx, `UPDATE working_papers SET title='late edit' WHERE id=$1`, wp)
	exec(`SELECT set_config('manris.simulated_now','2026-08-01T00:00:00+07',true)`)
	expectConfiguredDBError(t, ctx, tx, `INSERT INTO evaluation_sections(evaluation_id,section_key,title,sort_order) VALUES($1,'late','Late',2)`, eval)
}
