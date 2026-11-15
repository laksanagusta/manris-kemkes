package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/repository"
)

func TestSettingsServerPagination(t *testing.T) {
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
		CREATE TEMP TABLE organizations (id uuid PRIMARY KEY, name text, parent_id uuid, location text DEFAULT '') ON COMMIT DROP;
		CREATE TEMP TABLE users (id uuid PRIMARY KEY, name text) ON COMMIT DROP;
		CREATE TEMP TABLE organization_groups (id uuid PRIMARY KEY, owner_organization_id uuid, name text, description text, created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()) ON COMMIT DROP;
		CREATE TEMP TABLE organization_group_members (group_id uuid, organization_id uuid) ON COMMIT DROP;
		CREATE TEMP TABLE meeting_minutes (id uuid, title text, date date DEFAULT '2026-11-15', participants text[] DEFAULT '{}', agenda text[] DEFAULT '{}', summary text DEFAULT '', key_points text[] DEFAULT '{}', decisions text[] DEFAULT '{}', open_issues text[] DEFAULT '{}', action_items jsonb DEFAULT '[]', next_check_in timestamptz, transcript text DEFAULT '', organization_id uuid, created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()) ON COMMIT DROP;
	`)
	org, otherOrg, user, otherUser := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	exec(`INSERT INTO organizations(id,name) VALUES($1,'Unit A'), ($2,'Unit B')`, org, otherOrg)
	exec(`INSERT INTO users VALUES($1,'Author A'), ($2,'Author B')`, user, otherUser)
	for i, title := range []string{"Alpha", "Beta", "Gamma"} {
		id := uuid.New()
		exec(`INSERT INTO organization_groups(id,owner_organization_id,name,description) VALUES($1,$2,$3,'Needle description')`, id, org, title)
		exec(`INSERT INTO organization_group_members VALUES($1,$2)`, id, otherOrg)
		author := user
		if i == 2 {
			author = otherUser
		}
		exec(`INSERT INTO meeting_minutes(id,title,organization_id,created_by,participants) VALUES($1,$2,$3,$4,ARRAY['Needle participant'])`, id, title, org, author)
	}
	t.Run("group filters and members", func(t *testing.T) {
		repo := &organizationGroupRepository{pool: tx}
		filter := repository.OrganizationGroupListFilter{OwnerOrganizationID: &org, Q: "needle", Page: 1, Limit: 2, SortBy: "name", SortOrder: "asc", IncludeMembers: true}
		first, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(first) != 2 || first[0].Name != "Alpha" || len(first[0].Members) != 1 {
			t.Fatalf("group first page: %+v %d %v", first, total, err)
		}
		filter.Page = 2
		second, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(second) != 1 || second[0].Name != "Gamma" {
			t.Fatalf("group second page: %+v %d %v", second, total, err)
		}
		filter.GroupID, filter.Page = &first[0].ID, 1
		filtered, total, err := repo.List(ctx, filter)
		if err != nil || total != 1 || len(filtered) != 1 {
			t.Fatalf("group predicate: %d %v", total, err)
		}
		options, err := repo.ListOptions(ctx, &org)
		if err != nil || len(options) != 3 {
			t.Fatalf("group options depend on page: %v %v", options, err)
		}
	})
	t.Run("minute search authors and pages", func(t *testing.T) {
		repo := &meetingMinuteRepository{pool: tx}
		filter := repository.ListMeetingMinutesOptions{OrgIDs: []uuid.UUID{org}, Query: "needle", SortBy: "title", SortOrder: "asc", Limit: 2}
		first, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(first) != 2 || first[0].Title != "Alpha" {
			t.Fatalf("minute first page: %+v %d %v", first, total, err)
		}
		filter.Offset = 2
		second, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(second) != 1 || second[0].Title != "Gamma" {
			t.Fatalf("minute second page: %+v %d %v", second, total, err)
		}
		filter.Offset, filter.Date, filter.CreatedBy = 0, "2026-11-15", &otherUser
		filtered, total, err := repo.List(ctx, filter)
		if err != nil || total != 1 || len(filtered) != 1 {
			t.Fatalf("minute filters: %+v %d %v", filtered, total, err)
		}
		authors, err := repo.ListAuthors(ctx, []uuid.UUID{org})
		if err != nil || len(authors) != 2 {
			t.Fatalf("authors depend on page: %v %v", authors, err)
		}
		filter.OrgIDs = []uuid.UUID{}
		_, total, err = repo.List(ctx, filter)
		if err != nil || total != 0 {
			t.Fatalf("empty scope widened: %d %v", total, err)
		}
	})
}
