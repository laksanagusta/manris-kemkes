package postgres_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestDocumentAnalysisTasksRestrictActiveOrganizationStatusAndFields(t *testing.T) {
	parent := setupPool(t) // Requires an explicitly configured test database; otherwise skipped.
	ctx := context.Background()
	schema := "document_context_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if _, err := parent.Exec(ctx, `CREATE SCHEMA `+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = parent.Exec(ctx, `DROP SCHEMA `+schema+` CASCADE`) })
	cfg := parent.Config().Copy()
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if _, err := pool.Exec(ctx, `CREATE TABLE risks(id uuid PRIMARY KEY, organization_id uuid, code text, title text, status text, is_current boolean, is_cycle_current boolean, archived_at timestamptz, superseded_by_risk_id uuid);
		CREATE TABLE mitigations(id uuid PRIMARY KEY, action text, owner text);
		CREATE TABLE mitigation_tasks(id uuid PRIMARY KEY, mitigation_id uuid, risk_id uuid, period_label text, status text, notes text, evidence_url text);`); err != nil {
		t.Fatal(err)
	}
	org, otherOrg := uuid.New(), uuid.New()
	for _, item := range []struct {
		org                             uuid.UUID
		code, period, status, lifecycle string
	}{
		{org, "R-1", "2026-Q4", "pending", "active"}, {org, "R-2", "2026-Q4", "overdue", "active"},
		{otherOrg, "R-OTHER", "2026-Q4", "pending", "active"}, {org, "R-OLD", "2026-Q3", "pending", "obsolete"},
		{org, "R-STILL-ACTIVE", "2026-Q3", "pending", "active"},
		{org, "R-DRAFT", "2026-Q4", "pending", "draft"},
		{org, "R-ARCHIVED", "2026-Q4", "pending", "archived"},
		{org, "R-SUPERSEDED", "2026-Q4", "pending", "superseded"},
		{org, "R-CYCLE-OLD", "2026-Q4", "pending", "cycle-old"},
		{org, "R-DONE", "2026-Q4", "done", "active"}, {org, "R-SKIP", "2026-Q4", "skipped", "active"}, {org, "R-MISSING", "2026-Q4", "not_reported", "active"},
	} {
		riskID, mitigationID := uuid.New(), uuid.New()
		if _, err := pool.Exec(ctx, `INSERT INTO risks VALUES($1,$2,$3,'Risk title',$4,$5,$6,CASE WHEN $7 THEN NOW() ELSE NULL END,CASE WHEN $8 THEN $1 ELSE NULL END)`, riskID, item.org, item.code, map[bool]string{true: "draft", false: "final"}[item.lifecycle == "draft"], item.lifecycle != "obsolete", item.lifecycle != "cycle-old", item.lifecycle == "archived", item.lifecycle == "superseded"); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, `INSERT INTO mitigations VALUES($1,'Action','PRIVATE-OWNER')`, mitigationID); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, `INSERT INTO mitigation_tasks VALUES($1,$2,$3,$4,$5,'PRIVATE-NOTES','PRIVATE-EVIDENCE')`, uuid.New(), mitigationID, riskID, item.period, item.status); err != nil {
			t.Fatal(err)
		}
	}
	repo := postgres.NewDocumentAnalysisTaskRepository(pool)
	tasks, err := repo.ListForDocumentAnalysis(ctx, []uuid.UUID{org}, 51)
	if err != nil {
		t.Fatal(err)
	}
	if len(tasks) != 3 {
		t.Fatalf("got %d tasks, want open tasks from active risk versions including an unreassessed earlier-cycle risk", len(tasks))
	}
	encoded, err := json.Marshal(tasks)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "PRIVATE-") || strings.Contains(string(encoded), "R-OTHER") || strings.Contains(string(encoded), "R-OLD") || strings.Contains(string(encoded), "R-DRAFT") || strings.Contains(string(encoded), "R-ARCHIVED") || strings.Contains(string(encoded), "R-SUPERSEDED") || strings.Contains(string(encoded), "R-CYCLE-OLD") {
		t.Fatal("unnecessary or out-of-scope data returned")
	}
	if _, err := repo.ListForDocumentAnalysis(ctx, nil, 51); err == nil {
		t.Fatal("unscoped context query must fail closed")
	}
}
