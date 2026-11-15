package postgres

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestUPRReportCollectionSortAllowlist(t *testing.T) {
	if order := uprReportCollectionOrder(UPRReportCollectionFilter{SortBy: "title; DROP TABLE users"}); order != "lane ASC, sort_time DESC NULLS LAST, id DESC" {
		t.Fatalf("unknown sort must use timeline order: %s", order)
	}
	order := uprReportCollectionOrder(UPRReportCollectionFilter{SortBy: "title", SortOrder: "asc"})
	if !strings.HasPrefix(order, "LOWER(title) ASC NULLS LAST") || !strings.HasSuffix(order, "id DESC") {
		t.Fatalf("incorrect explicit sort: %s", order)
	}
}

func TestUPRReportCollectionServerPagination(t *testing.T) {
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
		CREATE TEMP TABLE organizations (id uuid, name text, parent_id uuid, upr_level text) ON COMMIT DROP;
		CREATE TEMP TABLE upr_report_drafts (
			id uuid, organization_id uuid, payload jsonb, updated_at timestamptz, sent_version_id uuid
		) ON COMMIT DROP;
		CREATE TEMP TABLE upr_report_versions (
			id uuid, organization_id uuid, kind text, period text, version integer, snapshot jsonb, finalized_at timestamptz
		) ON COMMIT DROP;
		CREATE TEMP TABLE upr_report_deliveries (
			report_version_id uuid, recipient_organization_id uuid, sent_at timestamptz, resolution text
		) ON COMMIT DROP;
	`)
	own, child, unrelated := uuid.New(), uuid.New(), uuid.New()
	draft, outgoing, incoming, secret := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	exec(`INSERT INTO organizations VALUES
		($1,'Induk',NULL,'upr_t1'),($2,'Anak',$1,'upr_t2'),($3,'Rahasia',NULL,'upr_t1')`, own, child, unrelated)
	exec(`INSERT INTO upr_report_drafts VALUES
		($1,$2,'{"title":"Draf","year":2026,"semester":2}','2026-11-02',NULL)`, draft, own)
	exec(`INSERT INTO upr_report_versions VALUES
		($1,$2,'semester','2026-H1',1,'{"title":"Laporan lama"}','2026-07-01'),
		($3,$4,'evaluation','2026-Q3',1,'{}','2026-10-01'),
		($5,$6,'semester','2025-H2',1,'{"title":"Rahasia"}','2026-11-15')`,
		outgoing, own, incoming, child, secret, unrelated)
	exec(`INSERT INTO upr_report_deliveries VALUES ($1,$2,'2026-10-02','accepted')`, incoming, own)

	read := func(filter UPRReportCollectionFilter) (int, []UPRReportCollectionRow) {
		t.Helper()
		args := []any{own, filter.Query, filter.OrganizationID, filter.Period, filter.Status}
		var total int
		if err := tx.QueryRow(ctx, uprReportCollectionSQL+" SELECT COUNT(*) FROM records"+uprReportCollectionPredicates, args...).Scan(&total); err != nil {
			t.Fatal(err)
		}
		query := uprReportCollectionSQL+" SELECT id,draft,title,period,status,unit,version,time FROM records"+
			uprReportCollectionPredicates+" ORDER BY "+uprReportCollectionOrder(filter)+" LIMIT $6 OFFSET $7"
		args = append(args, filter.Limit, (filter.Page-1)*filter.Limit)
		rows, err := tx.Query(ctx, query, args...)
		if err != nil {
			t.Fatal(err)
		}
		items, err := pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportCollectionRow])
		if err != nil {
			t.Fatal(err)
		}
		return total, items
	}
	total, first := read(UPRReportCollectionFilter{Page: 1, Limit: 2})
	if total != 3 || len(first) != 2 || first[0].ID != draft || first[1].ID != incoming {
		t.Fatalf("merged first page/count mismatch: %d %+v", total, first)
	}
	total, second := read(UPRReportCollectionFilter{Page: 2, Limit: 2})
	if total != 3 || len(second) != 1 || second[0].ID != outgoing {
		t.Fatalf("merged second page mismatch: %d %+v", total, second)
	}
	for _, filter := range []UPRReportCollectionFilter{
		{Query: "Anak"},
		{OrganizationID: &child},
		{Period: "2026-Q3"},
		{Status: "accepted"},
	} {
		filter.Page, filter.Limit = 1, 1
		total, items := read(filter)
		if total != 1 || len(items) != 1 || items[0].ID != incoming {
			t.Fatalf("server predicate must filter before count/page: %+v %d %+v", filter, total, items)
		}
	}
	total, items := read(UPRReportCollectionFilter{Query: "%", Page: 1, Limit: 1})
	if total != 0 || len(items) != 0 {
		t.Fatalf("search wildcard must be literal: %d %+v", total, items)
	}
	rows, err := tx.Query(ctx, uprReportCollectionSQL+" SELECT DISTINCT period FROM records ORDER BY period DESC", own)
	if err != nil {
		t.Fatal(err)
	}
	periods, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil || len(periods) != 3 {
		t.Fatalf("period choices must cover the full authorized result: %v %v", periods, err)
	}
}
