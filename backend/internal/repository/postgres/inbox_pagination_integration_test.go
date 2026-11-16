package postgres

import (
	"context"
	"encoding/json"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/repository"
)

// Every table and fixture belongs to this transaction's temporary schema.
func TestInboxServerPagination(t *testing.T) {
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
	_, err = tx.Exec(ctx, `
		CREATE TEMP TABLE organizations (id uuid, name text) ON COMMIT DROP;
		CREATE TEMP TABLE users (id uuid, name text) ON COMMIT DROP;
		CREATE TEMP TABLE risks (id uuid, code text, title text, organization_id uuid) ON COMMIT DROP;
		CREATE TEMP TABLE approval_requests (
			id uuid, created_at timestamptz, request_type text, entity_id uuid, current_status text,
			current_approver_user_id uuid, requested_by uuid, requested_at timestamptz,
			current_approver_role text, notes text
		) ON COMMIT DROP;
		CREATE TEMP TABLE working_papers (
			id uuid, created_at timestamptz, title text, org_id uuid, assessment_cycle text,
			current_signatory_sequence integer, status text
		) ON COMMIT DROP;
		CREATE TEMP TABLE working_paper_signatories (
			id uuid, working_paper_id uuid, user_id uuid, sequence_no integer,
			status text, signer_pangkat text
		) ON COMMIT DROP;
	`)
	if err != nil {
		t.Fatal(err)
	}
	user, org, otherOrg, risk, paper := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	_, err = tx.Exec(ctx, `INSERT INTO organizations VALUES ($1, 'Unit A'), ($2, 'Unit B')`, org, otherOrg)
	if err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(ctx, `INSERT INTO users VALUES ($1, 'Requester')`, user)
	if err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(ctx, `INSERT INTO risks VALUES ($1, 'R-1', 'Risk one', $2)`, risk, org)
	if err != nil {
		t.Fatal(err)
	}
	for _, status := range []string{"pending", "approved", "rejected"} {
		_, err = tx.Exec(ctx, `INSERT INTO approval_requests VALUES (
			$1, '2026-01-01', 'risk', $2, $3, $4, $4, '2026-01-01', 'reviewer', 'Approval notes'
		)`, uuid.New(), risk, status, user)
		if err != nil {
			t.Fatal(err)
		}
	}
	_, err = tx.Exec(ctx, `INSERT INTO working_papers VALUES ($1, '2026-01-02', 'Paper one', $2, '2026-Q1', 0, 'signing')`, paper, org)
	if err != nil {
		t.Fatal(err)
	}
	signingID := uuid.New()
	_, err = tx.Exec(ctx, `INSERT INTO working_paper_signatories VALUES ($1, $2, $3, 1, 'pending', 'IV/a'), ($4, $2, $3, 2, 'pending', 'IV/b')`, signingID, paper, user, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	repo := &inboxRepository{pool: tx}
	filter := repository.InboxFilter{UserID: user, ReadableOrgIDs: []uuid.UUID{org}, Page: 1, Limit: 2}
	first, err := repo.List(ctx, filter)
	if err != nil {
		t.Fatal(err)
	}
	var rows []map[string]any
	if err = json.Unmarshal(first.Data, &rows); err != nil {
		t.Fatal(err)
	}
	if first.Total != 4 || len(rows) != 2 || rows[0]["id"] != signingID.String() || first.Counts.MyApprovals != 2 || first.Counts.Approved != 1 || first.Counts.Rejected != 1 {
		t.Fatalf("mixed inbox page/counts mismatch: %+v %s", first, first.Data)
	}
	if rows[0]["workingPaperId"] != paper.String() || rows[0]["signerPangkat"] != "IV/a" ||
		rows[1]["entityId"] != risk.String() || rows[1]["entityOrgName"] != "Unit A" ||
		rows[1]["requestedByName"] != "Requester" || rows[1]["notes"] != "Approval notes" {
		t.Fatalf("inbox payload details mismatch: %s", first.Data)
	}
	seen := map[string]bool{}
	for _, row := range rows {
		seen[row["id"].(string)] = true
	}
	filter.Page = 2
	second, err := repo.List(ctx, filter)
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(second.Data, &rows); err != nil {
		t.Fatal(err)
	}
	if second.Total != 4 || len(rows) != 2 {
		t.Fatalf("second page mismatch: %+v", second)
	}
	for _, row := range rows {
		if seen[row["id"].(string)] {
			t.Fatal("row repeated between pages")
		}
	}
	filter.Page, filter.Status = 1, "my_approvals"
	actions, err := repo.List(ctx, filter)
	if err != nil || actions.Total != 2 {
		t.Fatalf("action filter mismatch: %+v %v", actions, err)
	}
	filter.Status, filter.Query, filter.SortBy, filter.SortOrder = "", "risk one", "title", "asc"
	searched, err := repo.List(ctx, filter)
	if err != nil || searched.Total != 3 || searched.Counts.All != 4 {
		t.Fatalf("search and independent KPI mismatch: %+v %v", searched, err)
	}
	for term, total := range map[string]int{"UNIT A": 3, "requester": 3, "iv/A": 1, "IV/b": 0} {
		filter.Query = term
		match, err := repo.List(ctx, filter)
		if err != nil || match.Total != total || match.Counts.All != 4 {
			t.Fatalf("search %q mismatch: %+v %v", term, match, err)
		}
	}
	filter.Query, filter.OrganizationID = "", &otherOrg
	forbidden, err := repo.List(ctx, filter)
	if err != nil || forbidden.Total != 0 || string(forbidden.Data) != "[]" {
		t.Fatalf("organization scope mismatch: %+v %v", forbidden, err)
	}
	filter.OrganizationID, filter.ReadableOrgIDs = nil, nil
	emptyScope, err := repo.List(ctx, filter)
	if err != nil || emptyScope.Total != 0 || emptyScope.Counts.All != 0 {
		t.Fatalf("empty authorized scope mismatch: %+v %v", emptyScope, err)
	}
}
