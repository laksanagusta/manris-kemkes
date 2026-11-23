package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// Fixtures are rolled back and only run against the explicit isolated test DB.
func TestDatedReportingLatestFinalAndHistory(t *testing.T) {
	dsn := os.Getenv("DATED_MONITORING_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires isolated database migrated through 86")
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
	if _, err := tx.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-11-13T00:00:00+07',true)`); err != nil {
		t.Fatal(err)
	}
	org, actor, group := uuid.New(), uuid.New(), uuid.New()
	if _, err := tx.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Dated reporting test')`, org); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,organization_id) VALUES($1,'Reporter',$2,$3,'test','unit',$4)`, actor, "report-"+actor.String(), actor.String()+"@example.test", org); err != nil {
		t.Fatal(err)
	}
	effective := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	risk := &entity.Risk{Code: "REPORT-" + group.String(), Title: "Observation report", Category: entity.RiskCategoryOperasional, Status: "final", VersionGroupID: group, OrganizationID: &org, CreatedBy: &actor, IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q1", Probability: 3, Impact: 3, TargetProbability: 1, TargetImpact: 1, EffectiveFrom: &effective, Mitigations: []entity.Mitigation{{Action: "Procedure review", Owner: "PIC"}}}
	if err := (&riskRepository{pool: tx}).Create(ctx, risk); err != nil {
		t.Fatal(err)
	}
	// A later recording/finalization date must not erase an in-period observation.
	if _, err := tx.Exec(ctx, `UPDATE risks SET finalized_at='2026-08-01' WHERE id=$1`, risk.ID); err != nil {
		t.Fatal(err)
	}
	observe := func(date, finalized, status string, score float64) *entity.RiskMonitoring {
		t.Helper()
		at, err := time.Parse(time.DateOnly, date)
		if err != nil {
			t.Fatal(err)
		}
		cycle := at.Format("2006") + "-Q" + string(rune('1'+(int(at.Month())-1)/3))
		m := entity.NewRiskMonitoringDraft(risk, cycle, actor)
		m.ObservedAt = date
		m.Status = status
		m.ObservedNilai = score
		m.Conclusion = "Reviewed"
		if finalized != "" {
			value, err := time.Parse(time.DateOnly, finalized)
			if err != nil {
				t.Fatal(err)
			}
			m.FinalizedAt = &value
		}
		if err := insertRiskMonitoring(ctx, tx, m); err != nil {
			t.Fatal(err)
		}
		return m
	}
	feb := observe("2026-02-05", "2026-07-10", "final", 16)
	apr := observe("2026-04-08", "2026-04-08", "final", 12)
	observe("2026-04-20", "2026-04-20", "final", 8)
	latest := observe("2026-04-20", "2026-06-01", "final", 4)
	observe("2026-04-10", "2026-08-01", "final", 20)
	monitoringDraft := observe("2026-05-01", "", "draft", 25)
	start, end := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC), time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	rows, _, err := loadQuarterlyRisks(ctx, tx, "2026-Q2", start, end, []uuid.UUID{org})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].MonitoringObservedNilai == nil || *rows[0].MonitoringObservedNilai != 4 || rows[0].MonitoringObservedAt == nil || *rows[0].MonitoringObservedAt != "2026-04-20" {
		t.Fatalf("latest final result mismatch: %+v", rows)
	}
	preview, summary, err := scanRosterPreview(ctx, tx, org, rosterPeriod{MonitoringCycle: "2026-Q2"})
	if err != nil {
		t.Fatal(err)
	}
	if len(preview) != 1 || summary.FinalizedCount != 1 || preview[0].MonitoringID == nil || *preview[0].MonitoringID != latest.ID {
		t.Fatalf("roster duplicated or picked draft/older final: %+v", preview)
	}
	// A period without an observation does not reuse the previous quarter's score.
	q3, _, err := loadQuarterlyRisks(ctx, tx, "2026-Q3", end, end.AddDate(0, 3, 0), []uuid.UUID{org})
	if err != nil || len(q3) != 1 || q3[0].MonitoringObservedNilai != nil {
		t.Fatalf("Q3 borrowed an out-of-period observation: %+v %v", q3, err)
	}
	profile := uuid.New()
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,created_by,finalized_by,finalized_at) VALUES($1,$2,2026,1,$3,$3,'2026-01-01')`, profile, org, actor); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline) VALUES($1,$2,$3,'2026-01-01','{"code":"R","score":9}')`, profile, group, risk.ID); err != nil {
		t.Fatal(err)
	}
	for _, occurred := range []time.Time{time.Date(2026, 6, 30, 16, 59, 0, 0, time.UTC), time.Date(2026, 6, 30, 17, 0, 0, 0, time.UTC)} {
		event := &entity.RiskEvent{Description: "Semester cutoff event", OccurredAt: occurred, Severity: "low", ImpactTypes: []string{"operational"}, SourceRefs: []entity.DocumentSourceRef{}, CreatedBy: actor, OrganizationID: org}
		if err := (&riskEventRepository{pool: tx}).Create(ctx, event, []uuid.UUID{risk.ID}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := tx.Exec(ctx, `INSERT INTO mitigation_tasks(mitigation_id,risk_id,period_label,period_start,period_end,due_date,status,generated_by,reported_at,reported_by,notes)
        SELECT id,risk_id,'2026-Q2','2026-04-01','2026-06-30','2026-06-30','done','manual','2026-06-30 16:59:00+00',$2,'Completed before cutoff'
        FROM mitigations WHERE risk_id=$1`, risk.ID, actor); err != nil {
		t.Fatal(err)
	}
	var raw []byte
	var corrections []UPRReportCorrection
	if err := tx.QueryRow(ctx, semesterRiskSnapshotSQL, org, 2026, 1, "2026-06-30", []string{"2026-Q1", "2026-Q2"}, false).Scan(&raw, &corrections); err != nil {
		t.Fatal(err)
	}
	var semester []struct {
		Score             int                           `json:"score"`
		Monitoring        []entity.RiskMonitoring       `json:"monitoring"`
		MitigationReports []struct{ ReportedOn string } `json:"mitigationReports"`
		Events            []struct{ OccurredOn string } `json:"events"`
		Latest            struct {
			ID         uuid.UUID `json:"id"`
			Score      int       `json:"score"`
			ObservedAt string    `json:"observedAt"`
		} `json:"latestMonitoring"`
	}
	if err := json.Unmarshal(raw, &semester); err != nil {
		t.Fatal(err)
	}
	if len(semester) != 1 || semester[0].Score != 9 || len(semester[0].Monitoring) != 5 || semester[0].Latest.ID != latest.ID || semester[0].Latest.Score != 4 {
		t.Fatalf("semester lost baseline/history or latest result: %s", raw)
	}
	if len(semester[0].MitigationReports) != 1 || semester[0].MitigationReports[0].ReportedOn != "2026-06-30" ||
		len(semester[0].Events) != 1 || semester[0].Events[0].OccurredOn != "2026-06-30" {
		t.Fatalf("semester activities did not respect Jakarta cutoff: %s", raw)
	}
	// A Q1 task reviewed by an April observation remains a Q1 activity.
	if _, err := tx.Exec(ctx, `INSERT INTO mitigation_tasks(mitigation_id,risk_id,monitoring_id,period_label,period_start,period_end,due_date,status,generated_by) SELECT id,risk_id,$2,'2026-Q1','2026-01-01','2026-03-31','2026-03-31','pending','manual' FROM mitigations WHERE risk_id=$1`, risk.ID, monitoringDraft.ID); err != nil {
		t.Fatal(err)
	}
	tasks, err := loadQuarterlyTasks(ctx, tx, "2026-Q1", start.AddDate(0, -3, 0), start, []uuid.UUID{org})
	if err != nil || len(tasks) != 1 {
		t.Fatalf("Q1 task moved to observation quarter: %+v %v", tasks, err)
	}
	// Working-paper projections carry the observation date, then a signing snapshot freezes it.
	paper := &entity.WorkingPaper{Title: "Dated KK", OrgID: org, CreatedBy: actor, Status: "draft", AssessmentCycle: "2026-Q2", Risks: []entity.WorkingPaperRiskLink{{RiskID: risk.ID, SourceMode: "review_periodic"}}}
	wpRepo := &workingPaperRepository{pool: tx}
	if err := wpRepo.Create(ctx, paper); err != nil {
		t.Fatal(err)
	}
	loaded, err := wpRepo.GetByID(ctx, paper.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.Risks) != 1 || loaded.Risks[0].Risk.Monitoring == nil || loaded.Risks[0].Risk.Monitoring.ID != latest.ID || loaded.Risks[0].Risk.Monitoring.ObservedAt != "2026-04-20" {
		t.Fatalf("KK result/date mismatch: %+v", loaded.Risks)
	}
	hash, err := loaded.SigningReviewHash()
	if err != nil {
		t.Fatal(err)
	}
	if err := loaded.LockSigningContent(hash); err != nil {
		t.Fatal(err)
	}
	loaded.Status = "completed"
	if err := wpRepo.updateWorkingPaper(ctx, tx, loaded); err != nil {
		t.Fatal(err)
	}
	observe("2026-06-30", "2026-07-01", "final", 2)
	frozen, err := wpRepo.GetByID(ctx, paper.ID)
	if err != nil {
		t.Fatal(err)
	}
	if frozen.Risks[0].Risk.Monitoring.ID != latest.ID {
		t.Fatal("later observation changed frozen KK")
	}
	// Operator work shows the monitoring draft. Historical standalone reports remain in the archive.
	var workRows int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM (`+operatorWorkSQL+`) work`, org).Scan(&workRows); err != nil {
		t.Fatal(err)
	}
	if workRows != 2 {
		t.Fatalf("expected one linked report and its draft; got %d", workRows)
	}
	progress, err := loadUnitProgressRisks(ctx, tx, repository.QuarterlyReportPeriod{Cycle: "2026-Q2", Start: start, End: end}, []uuid.UUID{org})
	if err != nil || len(progress) != 1 || progress[0].MonitoringStatus != "final" {
		t.Fatalf("progress duplicates: %+v %v", progress, err)
	}
	// Profile KK includes every profile member, even without monitoring, and
	// may use a result from a previous quarter if it is the latest by cutoff.
	addRisk := func(title string) *entity.Risk {
		t.Helper()
		groupID := uuid.New()
		item := &entity.Risk{Code: "PROFILE-" + groupID.String(), Title: title, Category: entity.RiskCategoryOperasional, Status: "final", VersionGroupID: groupID, OrganizationID: &org, CreatedBy: &actor, IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q1", Probability: 3, Impact: 3, TargetProbability: 1, TargetImpact: 1, EffectiveFrom: &effective}
		if err := (&riskRepository{pool: tx}).Create(ctx, item); err != nil {
			t.Fatal(err)
		}
		return item
	}
	member := addRisk("Included without monitoring")
	addRisk("Outside profile")
	if _, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,effective_from,baseline) VALUES($1,$2,$3,'2026-01-01','{}')`, profile, member.VersionGroupID, member.ID); err != nil {
		t.Fatal(err)
	}
	aprPreview, err := wpRepo.PreviewProfileRoster(ctx, org, profile, "2026-04-08")
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range aprPreview.Entries {
		if entry.VersionGroupID == group && (entry.MonitoringID == nil || *entry.MonitoringID != apr.ID || entry.ObservedAt != "2026-04-08") {
			t.Fatalf("expected April 8 result by April 8 cutoff: %+v", entry)
		}
	}
	cutoff := "2026-04-01"
	profilePreview, err := wpRepo.PreviewProfileRoster(ctx, org, profile, cutoff)
	if err != nil || profilePreview.Summary.FinalizedCount != 1 || len(profilePreview.Entries) != 2 || profilePreview.AssessmentCycle != "2026-Q2" {
		t.Fatalf("profile preview: %+v %v", profilePreview, err)
	}
	profilePaper := &entity.WorkingPaper{ID: uuid.New(), OrgID: org, CreatedBy: actor, Status: "draft", ProfileVersionID: &profile, ObservationCutoff: cutoff, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if err := wpRepo.CreateWithPeriodRoster(ctx, profilePaper, profilePreview.Revision, []entity.WorkingPaperRosterDecision{{VersionGroupID: member.VersionGroupID, Included: false}}); err != nil {
		t.Fatal(err)
	}
	profilePaper, err = wpRepo.GetByID(ctx, profilePaper.ID)
	if err != nil || len(profilePaper.Risks) != 2 || profilePaper.ObservationCutoff != cutoff {
		t.Fatalf("saved profile KK: %+v %v", profilePaper, err)
	}
	if want := fmt.Sprintf("KK-%s-%d", cutoff, profilePaper.SequenceNo); profilePaper.Code != want {
		t.Fatalf("code = %q, want %q", profilePaper.Code, want)
	}
	papers, total, err := wpRepo.ListSorted(ctx, []uuid.UUID{org}, "", "", "", "", cutoff, 1, 10, "observation_cutoff", "desc")
	if err != nil || total != 1 || len(papers) != 1 || papers[0].ID != profilePaper.ID {
		t.Fatalf("list by cutoff: total %d, papers %+v, error %v", total, papers, err)
	}
	for _, link := range profilePaper.Risks {
		switch link.RiskID {
		case risk.ID:
			if link.Risk.Monitoring == nil || link.Risk.Monitoring.ID != feb.ID {
				t.Fatalf("expected February result by April 1 cutoff: %+v", link.Risk.Monitoring)
			}
		case member.ID:
			if link.Risk.Monitoring != nil {
				t.Fatal("member has no observations")
			}
		default:
			t.Fatalf("risk outside profile included: %s", link.RiskID)
		}
	}
	blockers, err := wpRepo.ListSigningBlockers(ctx, profilePaper.ID)
	if err != nil || len(blockers) != 1 || blockers[0].VersionGroupID != member.VersionGroupID {
		t.Fatalf("only the member without monitoring should block signing: %+v %v", blockers, err)
	}
}
