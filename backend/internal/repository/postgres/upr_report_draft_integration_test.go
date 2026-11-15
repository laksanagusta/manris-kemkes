package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestUPRReportDraftSend(t *testing.T) {
	dsn := os.Getenv("UPR_REPORT_DRAFT_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires a disposable database migrated through 87")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	parent, org, other, actor := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	profile, paper, otherPaper, template, evaluation := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`INSERT INTO organizations(id,name,upr_level,parent_id) VALUES
		($1,'Induk','upr_t1',NULL),($2,'Unit','upr_t2',$1),($3,'Unit lain','upr_t2',$1)`, parent, org, other)
	exec(`INSERT INTO users(id,name,username,email,password_hash,role,organization_id)
		VALUES($1,'Pelapor',$2,$3,'test','unit',$4)`, actor, actor.String(), actor.String()+"@example.test", org)
	exec(`INSERT INTO annual_risk_profile_versions(id,organization_id,year,version,created_by,finalized_by,finalized_at)
		VALUES($1,$2,2026,1,$3,$3,'2026-01-01')`, profile, org, actor)
	exec(`INSERT INTO working_papers(id,code,sequence_no,title,org_id,status,assessment_cycle,created_by,completed_at,tte_skipped)
		VALUES($1,'KK-UJI',1,'KK uji',$2,'completed','2026-Q2',$3,'2026-06-20',true),
		      ($4,'KK-LAIN',1,'KK unit lain',$5,'completed','2026-Q2',$3,'2026-06-20',true)`, paper, org, actor, otherPaper, other)
	exec(`INSERT INTO evaluation_templates(id,template_key,name,version,status) VALUES($1,$2,'Evaluasi Uji',1,'active')`, template, template.String())
	exec(`INSERT INTO evaluations(id,organization_id,period,template_id,status,code,sequence_no,finalized_at,problems)
		VALUES($1,$2,'2026-Q2',$3,'final','EV-UJI',1,'2026-06-20','Versi awal')`, evaluation, org, template)
	workflow := NewUPRWorkflow(pool)
	input := UPRReportDraftInput{Title: "  Laporan uji  ", UPRSemesterInput: UPRSemesterInput{Year: 2026, Semester: 1, ProfileID: &profile}}
	draft, err := workflow.SaveReportDraft(ctx, org, actor, uuid.Nil, 0, input)
	if err != nil || draft.Input.Title != "Laporan uji" {
		t.Fatalf("create draft: %+v %v", draft, err)
	}
	if _, err := workflow.GetReportDraft(ctx, parent, draft.ID); !errors.Is(err, ErrUPRNotFound) {
		t.Fatalf("parent must not see an unsubmitted draft: %v", err)
	}
	if _, err := workflow.SendReportDraft(ctx, org, actor, draft.ID, draft.Revision, ""); err == nil {
		t.Fatal("incomplete draft was sent")
	}
	input.EvaluationID = &evaluation
	input.WorkingPaperIDs = []uuid.UUID{otherPaper}
	if _, err := workflow.PreviewReportDraft(ctx, org, input); err == nil {
		t.Fatal("preview accepted another unit's paper")
	}
	input.WorkingPaperIDs = []uuid.UUID{paper}
	wrongSemester := input
	wrongSemester.Semester = 2
	if _, err := workflow.SaveReportDraft(ctx, org, actor, draft.ID, draft.Revision, wrongSemester); err == nil {
		t.Fatal("save accepted attachments from the other semester")
	}
	if _, err := workflow.PreviewReportDraft(ctx, org, wrongSemester); err == nil {
		t.Fatal("preview accepted attachments from the other semester")
	}
	// Simulate a draft that was saved before attachment period validation was introduced.
	previousDraft := uuid.New()
	exec(`INSERT INTO upr_report_drafts (id,organization_id,payload,created_by) VALUES ($1,$2,$3,$4)`, previousDraft, org, wrongSemester, actor)
	if _, err := workflow.SendReportDraft(ctx, org, actor, previousDraft, 1, ""); err == nil || !strings.Contains(err.Error(), "semester laporan") {
		t.Fatalf("send did not reject out-of-period attachments: %v", err)
	}
	saved, err := workflow.SaveReportDraft(ctx, org, actor, draft.ID, draft.Revision, input)
	if err != nil {
		t.Fatal(err)
	}
	workspace, err := workflow.ReportWorkspace(ctx, org, true)
	if err != nil || len(workspace.Drafts) != 2 || len(workspace.Sources) != 2 {
		t.Fatalf("draft list or available sources: %+v %v", workspace, err)
	}
	for _, test := range []struct {
		kind, query string
		id          uuid.UUID
	}{
		{"profile", "profil 2026", profile},
		{"working_paper", "kk-uji", paper},
		{"evaluation", "ev-uji", evaluation},
	} {
		result, err := workflow.SearchReportDocuments(ctx, org, test.kind, input.UPRSemesterInput, test.query, 1)
		if err != nil || result.HasMore || len(result.Items) != 1 || result.Items[0].ID != test.id {
			t.Fatalf("search %s: %+v %v", test.kind, result, err)
		}
	}
	result, err := workflow.SearchReportDocuments(ctx, org, "working_paper", input.UPRSemesterInput, "%", 1)
	if err != nil || len(result.Items) != 0 {
		t.Fatalf("literal wildcard search: %+v %v", result, err)
	}
	selected, err := workflow.SelectedReportDocuments(ctx, org, input.UPRSemesterInput, []uuid.UUID{profile, paper, evaluation, otherPaper})
	if err != nil || len(selected) != 3 {
		t.Fatalf("restore selected documents scoped to unit: %+v %v", selected, err)
	}
	preview, err := workflow.PreviewReportDraft(ctx, org, saved.Input)
	if err != nil || len(preview.Supporting) != 2 || preview.ReviewKey == "" {
		t.Fatalf("preview: %+v %v", preview, err)
	}
	exec(`UPDATE evaluations SET problems='Revisi sebelum kirim' WHERE id=$1`, evaluation)
	if _, err := workflow.SendReportDraft(ctx, org, actor, draft.ID, saved.Revision, preview.ReviewKey); err == nil {
		t.Fatal("content changed after preview but was still sent")
	}
	preview, err = workflow.PreviewReportDraft(ctx, org, saved.Input)
	if err != nil {
		t.Fatal(err)
	}
	sent, err := workflow.SendReportDraft(ctx, org, actor, draft.ID, saved.Revision, preview.ReviewKey)
	if err != nil {
		t.Fatal(err)
	}
	retried, err := workflow.SendReportDraft(ctx, org, actor, draft.ID, saved.Revision, preview.ReviewKey)
	if err != nil || retried != sent {
		t.Fatalf("repeat send: %v %v", retried, err)
	}
	exec(`UPDATE evaluations SET problems='Revisi setelah kirim' WHERE id=$1`, evaluation)
	report, err := workflow.ReportDetail(ctx, parent, sent)
	if err != nil || report.Title != "Laporan uji" || report.DeliveryID == nil {
		t.Fatalf("received report: %+v %v", report, err)
	}
	var frozen UPRSemesterSnapshot
	if err := json.Unmarshal(report.Snapshot, &frozen); err != nil {
		t.Fatal(err)
	}
	for _, item := range frozen.Supporting {
		if item.Kind == "evaluation" {
			var contents struct{ Problems string }
			if err := json.Unmarshal(item.Contents, &contents); err != nil || contents.Problems != "Revisi sebelum kirim" {
				t.Fatalf("evaluation was not frozen: %+v %v", contents, err)
			}
		}
	}
	workspace, err = workflow.ReportWorkspace(ctx, org, true)
	if err != nil || len(workspace.Drafts) != 1 || workspace.Drafts[0].ID != previousDraft || len(workspace.Outgoing) != 1 {
		t.Fatalf("sent draft remains in inbox: %+v %v", workspace, err)
	}
}

// Coverage follows the monitored calendar period even when the submission
// window opens in the next semester or the next year.
func TestReportDocumentCalendarCoverage(t *testing.T) {
	dsn := os.Getenv("UPR_REPORT_DRAFT_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires disposable report database")
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
	exec := func(query string, args ...any) {
		t.Helper()
		if _, err := tx.Exec(ctx, query, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`
		CREATE TEMP TABLE annual_risk_profile_versions (id uuid, organization_id uuid, year int, version int, finalized_at timestamptz);
		CREATE TEMP TABLE working_papers (id uuid, org_id uuid, title text, code text, observation_cutoff date, completed_at timestamptz, sequence_no int, assessment_cycle text, monitoring_period_id uuid, status text);
		CREATE TEMP TABLE evaluations (id uuid, organization_id uuid, code text, report_date date, created_at timestamptz, finalized_at timestamptz, sequence_no int, period text, monitoring_period_id uuid, status text);
		CREATE TEMP TABLE monitoring_rules (id uuid, year int, frequency text);
		CREATE TEMP TABLE monitoring_rule_periods (id uuid, rule_id uuid, ordinal int, opens_on date, closes_on date);
	`)
	org := uuid.New()
	for _, tt := range []struct {
		name, frequency, legacyPeriod, observation string
		ordinal, year, semester                    int
	}{
		{"monthly June submitted July", "monthly", "2027-Q3", "2027-06-30", 6, 2027, 1},
		{"quarterly March", "quarterly", "2027-Q2", "2027-03-31", 1, 2027, 1},
		{"semester December submitted January", "semester", "2028-Q1", "2027-12-31", 2, 2027, 2},
		{"legacy quarter", "", "2027-Q3", "2027-09-30", 0, 2027, 2},
		{"legacy cutoff", "", "", "2027-06-30", 0, 2027, 1},
	} {
		t.Run(tt.name, func(t *testing.T) {
			exec("DELETE FROM working_papers; DELETE FROM evaluations")
			id, evaluation, rule := uuid.New(), uuid.New(), uuid.New()
			var period *uuid.UUID
			if tt.frequency != "" {
				value := uuid.New()
				period = &value
				exec("INSERT INTO monitoring_rules VALUES($1,$2,$3)", rule, tt.year, tt.frequency)
				exec("INSERT INTO monitoring_rule_periods VALUES($1,$2,$3,'2028-01-01','2028-01-31')", period, rule, tt.ordinal)
			}
			exec(`INSERT INTO working_papers VALUES($1,$2,'Test','KK',$3,'2028-01-02',1,$4,$5,'completed')`, id, org, tt.observation, tt.legacyPeriod, period)
			exec(`INSERT INTO evaluations VALUES($1,$2,'EV',$3,'2028-01-02','2028-01-02',1,$4,$5,'final')`, evaluation, org, tt.observation, tt.legacyPeriod, period)
			for _, semester := range []int{1, 2} {
				items, err := reportDocumentOptions(ctx, tx, org, "", UPRSemesterInput{Year: tt.year, Semester: semester}, nil, "", 0, 0)
				want := 0
				if semester == tt.semester {
					want = 2
					if tt.frequency == "" && tt.legacyPeriod == "" {
						// Only legacy working papers have an observation-cutoff fallback.
						want = 1
					}
				}
				if err != nil || len(items) != want {
					t.Fatalf("semester %d items=%+v, want %d: %v", semester, items, want, err)
				}
			}
			items, err := reportDocumentOptions(ctx, tx, org, "", UPRSemesterInput{Year: tt.year + 1, Semester: tt.semester}, nil, "", 0, 0)
			if err != nil || len(items) != 0 {
				t.Fatalf("accepted another year: %+v, %v", items, err)
			}
		})
	}
}
