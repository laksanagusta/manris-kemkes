//go:build integration

package postgres

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// This deliberately targets a database at88: upgrading populated immutable
// monitoring history must work, not just installing89 on an empty schema.
func TestRiskTransactionUpgradePreservesFinalHistory(t *testing.T) {
	dsn := os.Getenv("MIGRATION89_UPGRADE_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires disposable database at migration88")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	_, err = tx.Exec(ctx, `INSERT INTO risk_monitorings(source_risk_id,version_group_id,result_risk_id,assessment_cycle,status,mode,source_probability,source_impact,observed_probability,observed_impact,observed_at,profile_version_id,monitoring_period_id,draft_payload,evidence_snapshot,finalized_at) VALUES($1,$2,$1,'2026-Q2','final','with_profile_revision',3,3,2,2,'2026-06-30',$3,$4,'{"observedScoreConfirmed":true}','{"reports":[],"events":[]}',now())`, f.risk.ID, f.risk.VersionGroupID, f.profile, f.period)
	if err != nil {
		t.Fatal(err)
	}
	var planID, draftID uuid.UUID
	if err = tx.QueryRow(ctx, `INSERT INTO mitigations(risk_id,action,owner) VALUES($1,'Check stocks','Unit') RETURNING id`, f.risk.ID).Scan(&planID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2027-01-01T00:00:00+07',true)`); err != nil {
		t.Fatal(err)
	}
	if err = tx.QueryRow(ctx, `INSERT INTO risk_monitorings(source_risk_id,version_group_id,assessment_cycle,status,mode,source_probability,source_impact,observed_probability,observed_impact,observed_at,profile_version_id,monitoring_period_id) VALUES($1,$2,'2026-Q4','draft','score_only',3,3,2,2,'2026-12-31',$3,(SELECT id FROM monitoring_rule_periods WHERE rule_id=$4 AND ordinal=2)) RETURNING id`, f.risk.ID, f.risk.VersionGroupID, f.profile, f.rule).Scan(&draftID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2027-02-01T00:00:00+07',true)`); err != nil {
		t.Fatal(err)
	}
	_, file, _, _ := runtime.Caller(0)
	migration := filepath.Join(filepath.Dir(file), "../../../db/migrations/000089_risk_revision_monitoring_reports.up.sql")
	sql, err := os.ReadFile(migration)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, string(sql)); err != nil {
		t.Fatalf("upgrade populated final history: %v", err)
	}
	var status string
	var linked bool
	if err = tx.QueryRow(ctx, `SELECT status,profile_version_id=$1 AND monitoring_period_id=$2 FROM risk_monitorings WHERE source_risk_id=$3 AND status='final'`, f.profile, f.period, f.risk.ID).Scan(&status, &linked); err != nil {
		t.Fatal(err)
	}
	if status != "final" || !linked {
		t.Fatalf("historical final changed: %s linked=%v", status, linked)
	}
	var reportCount int
	if err = tx.QueryRow(ctx, "SELECT count(*) FROM mitigation_tasks WHERE monitoring_id=$1 AND mitigation_id=$2 AND reported_at IS NULL", draftID, planID).Scan(&reportCount); err != nil || reportCount != 1 {
		t.Fatalf("missing report item on migrated draft: %d %v", reportCount, err)
	}
}
