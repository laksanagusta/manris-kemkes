package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"os"
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
	saved, err := workflow.SaveReportDraft(ctx, org, actor, draft.ID, draft.Revision, input)
	if err != nil {
		t.Fatal(err)
	}
	workspace, err := workflow.ReportWorkspace(ctx, org, true)
	if err != nil || len(workspace.Drafts) != 1 || len(workspace.Sources) != 2 {
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
		result, err := workflow.SearchReportDocuments(ctx, org, test.kind, 2026, test.query, 1)
		if err != nil || result.HasMore || len(result.Items) != 1 || result.Items[0].ID != test.id {
			t.Fatalf("search %s: %+v %v", test.kind, result, err)
		}
	}
	result, err := workflow.SearchReportDocuments(ctx, org, "working_paper", 2026, "%", 1)
	if err != nil || len(result.Items) != 0 {
		t.Fatalf("literal wildcard search: %+v %v", result, err)
	}
	selected, err := workflow.SelectedReportDocuments(ctx, org, 2026, []uuid.UUID{profile, paper, evaluation, otherPaper})
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
	if err != nil || len(workspace.Drafts) != 0 || len(workspace.Outgoing) != 1 {
		t.Fatalf("sent draft remains in inbox: %+v %v", workspace, err)
	}
}
