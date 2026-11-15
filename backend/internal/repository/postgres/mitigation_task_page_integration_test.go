package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/repository"
)

func TestDocumentTaskServerPagination(t *testing.T) {
	dsn := os.Getenv("PAGINATION_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires PAGINATION_TEST_DATABASE_URL")
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
		CREATE TEMP TABLE risks (id uuid, code text, title text, organization_id uuid) ON COMMIT DROP;
		CREATE TEMP TABLE mitigations (id uuid, action text DEFAULT '', owner text DEFAULT '') ON COMMIT DROP;
		CREATE TEMP TABLE users (id uuid, name text) ON COMMIT DROP;
		CREATE TEMP TABLE risk_monitorings (id uuid PRIMARY KEY, status text) ON COMMIT DROP;
		CREATE TEMP TABLE mitigation_tasks (
			id uuid, mitigation_id uuid, risk_id uuid, monitoring_id uuid, period_label text,
			period_start date DEFAULT '2026-01-01', period_end date DEFAULT '2026-03-31', due_date date DEFAULT '2026-04-01',
			status text, evidence_url text DEFAULT '', notes text DEFAULT '', report_output text DEFAULT '', report_obstacle text DEFAULT '',
			reported_by uuid, reported_at timestamptz, generated_by text DEFAULT 'test', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
		) ON COMMIT DROP;
	`)
	org, outside, risk, mitigation, otherMitigation, monitoring := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	exec(`INSERT INTO risks VALUES($1,'R-1','Risk',$2)`, risk, org)
	exec(`INSERT INTO mitigations(id) VALUES($1),($2)`, mitigation, otherMitigation)
	exec(`INSERT INTO risk_monitorings VALUES($1,'final')`, monitoring)
	for i, status := range []string{"done", "overdue", "pending"} {
		mid, period := mitigation, "2026-Q1"
		if i == 2 {
			mid, period = otherMitigation, "2026-Q2"
		}
		exec(`INSERT INTO mitigation_tasks(id,mitigation_id,risk_id,monitoring_id,period_label,status) VALUES($1,$2,$3,$4,$5,$6)`, uuid.New(), mid, risk, monitoring, period, status)
	}
	repo := &mitigationTaskRepository{pool: tx}
	filter := repository.ScopedTaskPageFilter{RiskID: &risk, OrgIDs: []uuid.UUID{org}, Page: 1, Limit: 2}
	first, err := repo.ListScopedPage(ctx, filter)
	if err != nil || first.Total != 3 || len(first.Data) != 2 || first.Data[0].Status != "overdue" || first.Summary.Done != 1 {
		t.Fatalf("first page: %+v %v", first, err)
	}
	filter.Page = 2
	second, err := repo.ListScopedPage(ctx, filter)
	if err != nil || second.Total != 3 || len(second.Data) != 1 || second.Data[0].Status != "done" {
		t.Fatalf("second page: %+v %v", second, err)
	}
	filter.RiskID, filter.MonitoringID, filter.MitigationID, filter.Page = nil, &monitoring, &mitigation, 1
	filtered, err := repo.ListScopedPage(ctx, filter)
	if err != nil || filtered.Total != 2 || len(filtered.Data) != 2 || filtered.Summary.Total != 3 {
		t.Fatalf("filtered document/summary: %+v %v", filtered, err)
	}
	for _, task := range filtered.Data {
		if task.MonitoringStatus != "final" {
			t.Fatalf("task %s did not expose its final parent status", task.ID)
		}
	}
	periods, err := repo.ListPeriods(ctx, []uuid.UUID{org})
	if err != nil || len(periods) != 2 || periods[0] != "2026-Q2" {
		t.Fatalf("period metadata: %v %v", periods, err)
	}
	filter.OrgIDs = []uuid.UUID{outside}
	blocked, err := repo.ListScopedPage(ctx, filter)
	if err != nil || blocked.Total != 0 || len(blocked.Data) != 0 || blocked.Summary.Total != 0 {
		t.Fatalf("scope widened: %+v %v", blocked, err)
	}

	exec(`SELECT set_config('manris.simulated_now', '2027-12-01T00:00:00+07:00', true)`)
	exec(`INSERT INTO mitigation_tasks(id,mitigation_id,risk_id,period_label,status,due_date,notes,reported_at)
		VALUES ($3,$1,$2,'2027-Q4','pending','2027-11-30','Pelaksanaan masih berlangsung.','2027-12-01'),
		       ($4,$1,$2,'2027-Q4','skipped','2027-11-30','Pengadaan masih tertunda.','2027-12-01'),
		       ($5,$1,$2,'2027-Q4','pending','2027-11-30','',NULL),
		       ($6,$1,$2,'2027-Q4','pending','2027-12-10','',NULL)`,
		mitigation, risk, uuid.New(), uuid.New(), uuid.New(), uuid.New())
	for _, page := range []int{1, 2, 5} {
		collection, err := repo.ListCollectionPage(ctx, []uuid.UUID{org}, "", "", "2027-Q4", page, 1, "", "")
		if err != nil || collection.Total != 4 || collection.Summary != (repository.TaskCollectionSummary{Reported: 2, Overdue: 1, Upcoming: 1}) {
			t.Fatalf("page %d reporting summary: %+v, %v", page, collection, err)
		}
	}
	reported, err := repo.ListCollectionPage(ctx, []uuid.UUID{org}, "", "reported", "2027-Q4", 1, 10, "", "")
	if err != nil || reported.Total != 2 || len(reported.Data) != 2 {
		t.Fatalf("reported filter: %+v, %v", reported, err)
	}
	for _, task := range reported.Data {
		if task.Status != "pending" && task.Status != "skipped" {
			t.Fatalf("unexpected execution status on reported task: %s", task.Status)
		}
	}
}
