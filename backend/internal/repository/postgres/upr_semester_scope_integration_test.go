//go:build integration

package postgres

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestSemesterUsesSelectedProfileAndFrozenPeriodSources(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	fixture := seedConfiguredFixture(t, ctx, tx)
	exec := func(query string, args ...any) {
		t.Helper()
		if _, err := tx.Exec(ctx, query, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`UPDATE annual_risk_profile_members SET baseline='{"code":"R-UJI","score":9}' WHERE profile_version_id=$1`, fixture.profile)
	v2, firstPaper, secondPaper := uuid.New(), uuid.New(), uuid.New()
	completeMonitoring := func(f configuredFixture, date, cycle string) uuid.UUID {
		t.Helper()
		monitoring := fixtureMonitoring(f)
		monitoring.AssessmentCycle = cycle
		monitoring.ObservedAt = date
		if err := insertRiskMonitoring(ctx, tx, monitoring); err != nil {
			t.Fatal(err)
		}
		exec(`UPDATE risk_monitorings SET status='final',draft_payload='{"observedScoreConfirmed":true}',
			finalized_at=current_setting('manris.simulated_now')::timestamptz WHERE id=$1`, monitoring.ID)
		return monitoring.ID
	}
	const completedPaper = `INSERT INTO working_papers(id,code,sequence_no,title,org_id,status,assessment_cycle,created_by,
		completed_at,tte_skipped,profile_version_id,monitoring_period_id,observation_cutoff)
		VALUES($1,$2,$3,'KK uji',$4,'completed',$5,$6,current_setting('manris.simulated_now')::timestamptz,true,$7,$8,$9)`
	firstMonitoring := completeMonitoring(fixture, "2026-06-30", "2026-Q2")
	exec(completedPaper, firstPaper, "KK-UJI-1", 1, fixture.org, "2026-Q2", fixture.actor, fixture.profile, fixture.period, "2026-06-30")
	exec(`INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,previous_version_id,created_by,monitoring_rule_id,finalized_at)
		VALUES($1,$2,2026,2,$3,$4,$5,'2026-07-10 10:00:00+07')`, v2, fixture.org, fixture.profile, fixture.actor, fixture.rule)
	exec(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline,change_reason,historical_correction)
		VALUES($1,$2,$3,'2026-06-15','{"code":"R-UJI","score":15}','Koreksi atas bukti Juni',true)`,
		v2, fixture.risk.VersionGroupID, fixture.risk.ID)
	v2Fixture := fixture
	v2Fixture.profile = v2
	if err := tx.QueryRow(ctx, `SELECT id FROM monitoring_rule_periods WHERE rule_id=$1 AND ordinal=2`, fixture.rule).Scan(&v2Fixture.period); err != nil {
		t.Fatal(err)
	}
	exec(`SELECT set_config('manris.simulated_now','2027-01-05T00:00:00+07',true)`)
	secondMonitoring := completeMonitoring(v2Fixture, "2026-12-31", "2026-Q4")
	exec(completedPaper, secondPaper, "KK-UJI-2", 2, fixture.org, "2026-Q4", fixture.actor, v2, v2Fixture.period, "2026-12-31")

	read := func(profile uuid.UUID, half int, correct bool, papers ...uuid.UUID) (UPRSemesterSnapshot, error) {
		t.Helper()
		scope := UPRSemesterInput{Year: 2026, Semester: half, ProfileID: &profile, ApplyHistoricalCorrections: correct}
		if correct {
			scope.Reason = "Koreksi skor sesuai hasil telaah"
		}
		scope.selection = &UPRReportDraftInput{UPRSemesterInput: scope, Title: "Laporan", WorkingPaperIDs: papers}
		return buildSemester(ctx, tx, fixture.org, scope)
	}
	assertReport := func(result UPRSemesterSnapshot, err error, profile, expectedMonitoring uuid.UUID, score int) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
		var risks []struct {
			Score            int       `json:"score"`
			ProfileID        uuid.UUID `json:"profileId"`
			LatestMonitoring *struct {
				ID     uuid.UUID `json:"id"`
				Period string    `json:"period"`
			} `json:"latestMonitoring"`
		}
		if err := json.Unmarshal(result.Risks, &risks); err != nil {
			t.Fatal(err)
		}
		if len(risks) != 1 || risks[0].Score != score || risks[0].ProfileID != profile {
			t.Fatalf("unexpected scoped baseline: %s", result.Risks)
		}
		observation := risks[0].LatestMonitoring
		if expectedMonitoring == uuid.Nil {
			if observation != nil {
				t.Fatalf("future profile leaked into previous report: %+v", observation)
			}
			return
		}
		if observation == nil || observation.ID != expectedMonitoring || !strings.HasPrefix(observation.Period, "2026-H") {
			t.Fatalf("unexpected monitoring source: %+v", observation)
		}
	}
	ordinary, err := read(v2, 1, false, firstPaper)
	assertReport(ordinary, err, fixture.profile, firstMonitoring, 9)
	if len(ordinary.Periods) != 1 || ordinary.Periods[0].ProfileID != fixture.profile ||
		len(ordinary.Supporting) != 1 || ordinary.Supporting[0].ProfileID == nil || *ordinary.Supporting[0].ProfileID != fixture.profile {
		t.Fatalf("official predecessor source missing: %+v", ordinary)
	}
	corrected, err := read(v2, 1, true, firstPaper)
	assertReport(corrected, err, v2, firstMonitoring, 15)
	if len(corrected.Corrections) != 1 || corrected.Corrections[0].ProfileID != v2 || *corrected.Supporting[0].SourceID != firstPaper {
		t.Fatalf("correction must record provenance and retain the original official working paper: %+v", corrected)
	}
	if _, err := read(fixture.profile, 1, true, firstPaper); err == nil {
		t.Fatal("profile v1 has no matching historical correction")
	}
	earlier, err := read(fixture.profile, 2, false)
	assertReport(earlier, err, fixture.profile, uuid.Nil, 9)
	if _, err := read(fixture.profile, 2, false, secondPaper); err == nil {
		t.Fatal("report selected a later profile's attachment")
	}
	later, err := read(v2, 2, false, secondPaper)
	assertReport(later, err, v2, secondMonitoring, 15)

	// Migrated documents occasionally disagree on their source profile. Keep
	// the original attachment available after review without changing the roster.
	exec(`UPDATE annual_monitoring_period_locks SET profile_version_id=$3,needs_review=true
		WHERE organization_id=$1 AND monitoring_period_id=$2`, fixture.org, v2Fixture.period, fixture.profile)
	reviewed, err := read(v2, 2, false, secondPaper)
	assertReport(reviewed, err, fixture.profile, uuid.Nil, 9)
	if len(reviewed.Periods) != 1 || !reviewed.Periods[0].NeedsReview || len(reviewed.Supporting) != 1 ||
		reviewed.Supporting[0].ProfileID == nil || *reviewed.Supporting[0].ProfileID != v2 {
		t.Fatalf("reviewed historic sources must keep their separate provenance: %+v", reviewed)
	}
	_, cutoff, _, err := semesterPeriod(UPRSemesterInput{Year: 2026, Semester: 2})
	if err != nil {
		t.Fatal(err)
	}
	if err := validateSemesterSnapshot(reviewed, cutoff); err == nil {
		t.Fatal("ambiguous historic sources require a reason before sending")
	}
	reviewed.Reason = "Versi awal tetap menjadi cakupan resmi; KK mencatat sumber setelah revisi."
	if err := validateSemesterSnapshot(reviewed, cutoff); err != nil {
		t.Fatal(err)
	}
}
