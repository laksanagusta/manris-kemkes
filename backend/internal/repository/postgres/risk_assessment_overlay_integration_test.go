//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestPeriodAssessmentOverlayPreservesBaselineAndCutoff(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	query := riskPeriodSnapshotCTE + `SELECT probability,current_probability,nilai,current_nilai FROM risk_snapshots WHERE version_group_id=$2`
	read := func(cycle string) (int, int, float64, float64) {
		t.Helper()
		var base, current int
		var baseline, actual float64
		if err := tx.QueryRow(ctx, query, cycle, f.risk.VersionGroupID).Scan(&base, &current, &baseline, &actual); err != nil {
			t.Fatal(err)
		}
		return base, current, baseline, actual
	}
	base, current, baseline, actual := read("2026-Q1")
	if base != 3 || current != 3 || baseline != actual {
		t.Fatalf("fallback baseline=%v current=%v scores=%v/%v", base, current, baseline, actual)
	}
	id := uuid.New()
	_, err = tx.Exec(ctx, `INSERT INTO risk_monitorings(id,source_risk_id,version_group_id,assessment_cycle,status,mode,transaction_kind,source_probability,source_impact,observed_probability,observed_impact,observed_weight,observed_nilai,observed_at,profile_version_id,monitoring_period_id,draft_payload,finalized_at,result_risk_id) VALUES($1,$2,$3,'2026-Q2','draft','score_only','monitoring',3,3,1,1,1,1,'2026-06-30',$4,$5,'{"observedScoreConfirmed":true}',NULL,NULL)`, id, f.risk.ID, f.risk.VersionGroupID, f.profile, f.period)
	if err != nil {
		t.Fatal(err)
	}
	_, current, _, actual = read("2026-Q2")
	if current != base || actual != baseline {
		t.Fatalf("draft assessment leaked into official score: %d/%f", current, actual)
	}
	if _, err = tx.Exec(ctx, `UPDATE risk_monitorings SET status='final',finalized_at='2026-07-01',result_risk_id=$2 WHERE id=$1`, id, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	_, current, _, actual = read("2026-Q2")
	if current != 1 || actual != 1 {
		t.Fatalf("final monitoring overlay=%d/%f want1/1", current, actual)
	}
	_, current, _, actual = read("2026-Q1")
	if current != base || actual != baseline {
		t.Fatalf("future observation leaked into Q1: %d/%f", current, actual)
	}
	var persisted int
	if err := tx.QueryRow(ctx, `SELECT probability FROM risks WHERE id=$1`, f.risk.ID).Scan(&persisted); err != nil || persisted != 3 {
		t.Fatalf("persisted baseline mutated=%d err=%v", persisted, err)
	}
}
