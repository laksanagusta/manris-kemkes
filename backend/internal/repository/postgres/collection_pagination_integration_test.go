package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/repository"
)

func TestCollectionServerPagination(t *testing.T) {
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
		CREATE TEMP TABLE organizations (id uuid, name text, parent_id uuid, upr_level text, location text, address text, created_at timestamptz DEFAULT now()) ON COMMIT DROP;
		CREATE TEMP TABLE users (id uuid, name text) ON COMMIT DROP;
		CREATE TEMP TABLE controls (id uuid, name text, description text, control_type text DEFAULT '', frequency text DEFAULT '', owner text DEFAULT '', organization_id uuid, created_at timestamptz DEFAULT now()) ON COMMIT DROP;
		CREATE TEMP TABLE incidents (
			id uuid, code text, what text, "when" timestamptz DEFAULT now(), impact_types text[] DEFAULT '{}', other_impact_type text DEFAULT '',
			severity text, financial_loss numeric, financial_loss_known boolean, organization_id uuid, created_by uuid, updated_by uuid,
			created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), source_document_name text DEFAULT '', source_refs jsonb DEFAULT '[]', extraction_key text DEFAULT '', status text DEFAULT 'recorded'
		) ON COMMIT DROP;
		CREATE TEMP TABLE risks (id uuid, code text, title text) ON COMMIT DROP;
		CREATE TEMP TABLE incident_risk_links (incident_id uuid, risk_id uuid, created_at timestamptz DEFAULT now()) ON COMMIT DROP;
	`)
	if err != nil {
		t.Fatal(err)
	}
	org, child, otherOrg, user, risk := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	_, err = tx.Exec(ctx, `INSERT INTO organizations(id, name, parent_id, upr_level) VALUES ($1,'Root',NULL,'upr_t1'), ($2,'Child',$1,'upr_t2'), ($3,'Other',NULL,'upr_t1')`, org, child, otherOrg)
	if err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(ctx, `INSERT INTO users VALUES ($1,'Recorder')`, user)
	if err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(ctx, `INSERT INTO risks VALUES ($1,'R-1','Needle risk')`, risk)
	if err != nil {
		t.Fatal(err)
	}
	for _, orgID := range []uuid.UUID{org, org, otherOrg} {
		id := uuid.New()
		_, err = tx.Exec(ctx, `INSERT INTO controls(id,name,description,organization_id) VALUES($1,'Needle control','Recorded',$2)`, id, orgID)
		if err != nil {
			t.Fatal(err)
		}
		_, err = tx.Exec(ctx, `INSERT INTO incidents(id, code, what, severity, organization_id, created_by) VALUES ($1,'KJR-1','Recorded event','high',$2,$3)`, id, orgID, user)
		if err != nil {
			t.Fatal(err)
		}
		_, err = tx.Exec(ctx, `INSERT INTO incident_risk_links(incident_id,risk_id) VALUES ($1,$2)`, id, risk)
		if err != nil {
			t.Fatal(err)
		}
	}
	t.Run("organization hierarchy filters before paging", func(t *testing.T) {
		repo := &organizationRepository{pool: tx}
		rows, total, err := repo.ListWithFilter(ctx, repository.OrganizationListFilter{AncestorID: &org, Structure: "child", UPRLevel: "upr_t2", Page: 1, Limit: 1})
		if err != nil || total != 1 || len(rows) != 1 || rows[0].ID != child {
			t.Fatalf("hierarchy scope/count mismatch: %+v %d %v", rows, total, err)
		}
		rows, total, err = repo.ListWithFilter(ctx, repository.OrganizationListFilter{Structure: "root", UPRLevel: "upr_t2", Page: 1, Limit: 1})
		if err != nil || total != 0 || len(rows) != 0 {
			t.Fatalf("combined filters mismatch: %+v %d %v", rows, total, err)
		}
	})
	t.Run("control search and scope across pages", func(t *testing.T) {
		repo := &controlRepository{pool: tx}
		filter := repository.ControlListFilter{OrgIDs: []uuid.UUID{org}, Query: "Needle", Page: 1, Limit: 1}
		first, total, err := repo.ListPage(ctx, filter)
		if err != nil || total != 2 || len(first) != 1 {
			t.Fatalf("control first page/count mismatch: %+v %d %v", first, total, err)
		}
		filter.Page = 2
		second, total, err := repo.ListPage(ctx, filter)
		if err != nil || total != 2 || len(second) != 1 || first[0].ID == second[0].ID {
			t.Fatalf("control second page mismatch: %+v %d %v", second, total, err)
		}
		filter.OrganizationID = &otherOrg
		rows, total, err := repo.ListPage(ctx, filter)
		if err != nil || total != 0 || len(rows) != 0 {
			t.Fatalf("control scope widened: %+v %d %v", rows, total, err)
		}
	})
	t.Run("event linked-risk search before paging", func(t *testing.T) {
		repo := &riskEventRepository{pool: tx}
		filter := repository.RiskEventListFilter{OrgIDs: []uuid.UUID{org}, Query: "Needle", Severity: "high", SortBy: "severity", SortOrder: "asc", Page: 1, Limit: 1}
		first, total, err := repo.ListPage(ctx, filter)
		if err != nil || total != 2 || len(first) != 1 || len(first[0].LinkedRisks) != 1 {
			t.Fatalf("event first page/count mismatch: %+v %d %v", first, total, err)
		}
		filter.Page = 2
		second, total, err := repo.ListPage(ctx, filter)
		if err != nil || total != 2 || len(second) != 1 || first[0].ID == second[0].ID {
			t.Fatalf("event second page mismatch: %+v %d %v", second, total, err)
		}
		filter.Page = 3
		rows, total, err := repo.ListPage(ctx, filter)
		if err != nil || total != 2 || len(rows) != 0 {
			t.Fatalf("empty page loses total: %+v %d %v", rows, total, err)
		}
	})
}
