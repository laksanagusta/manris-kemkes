package postgres

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

func setupOrganizationGroupPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL is not set")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("ParseConfig: %v", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatalf("NewWithConfig: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("database unavailable: %v", err)
	}

	t.Cleanup(func() { pool.Close() })
	return pool
}

func insertOrganizationGroupTestOrganization(t *testing.T, pool *pgxpool.Pool, name string, parentID *uuid.UUID) uuid.UUID {
	t.Helper()

	id := uuid.New()
	if _, err := pool.Exec(context.Background(), `
		INSERT INTO organizations (id, name, parent_id)
		VALUES ($1, $2, $3)
	`, id, name, parentID); err != nil {
		t.Fatalf("insert organization: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM organizations WHERE id = $1`, id)
	})
	return id
}

func TestNormalizeOrganizationGroupMemberIDsDeduplicatesAndSkipsNil(t *testing.T) {
	first := uuid.New()
	second := uuid.New()

	got := normalizeOrganizationGroupMemberIDs([]uuid.UUID{first, second, uuid.Nil, first})
	if len(got) != 2 {
		t.Fatalf("expected 2 members, got %v", got)
	}
	if got[0] != first || got[1] != second {
		t.Fatalf("expected stable ordering, got %v", got)
	}
}

func TestMapOrganizationGroupErrorMapsDuplicateNameConflict(t *testing.T) {
	err := mapOrganizationGroupError(&pgconn.PgError{
		Code:           "23505",
		ConstraintName: "idx_organization_groups_owner_name_unique",
	})
	if !domainerrors.IsConflict(err) {
		t.Fatalf("expected conflict error, got %v", err)
	}
}

func TestMapOrganizationGroupErrorMapsNoRowsToNotFound(t *testing.T) {
	if !domainerrors.IsNotFound(mapOrganizationGroupError(pgx.ErrNoRows)) {
		t.Fatal("expected not found mapping")
	}
}

func TestOrganizationGroupQueriesBuildsExpectedClauses(t *testing.T) {
	ownerID := uuid.New()
	countQuery, dataQuery, args := organizationGroupQueries(repository.OrganizationGroupListFilter{
		OwnerOrganizationID: &ownerID,
		Q:                   "Jawa",
	})

	if !strings.Contains(countQuery, "COUNT(DISTINCT g.id)") {
		t.Fatalf("expected distinct group count, got %s", countQuery)
	}
	if !strings.Contains(dataQuery, "GROUP BY g.id, owner.name") {
		t.Fatalf("expected grouped data query, got %s", dataQuery)
	}
	if len(args) != 2 {
		t.Fatalf("expected 2 args, got %d", len(args))
	}
}

func TestOrganizationGroupRepositoryCrudAgainstDatabase(t *testing.T) {
	pool := setupOrganizationGroupPool(t)
	repo := NewOrganizationGroupRepository(pool)
	ctx := context.Background()

	rootID := insertOrganizationGroupTestOrganization(t, pool, "Group Root", nil)
	childAID := insertOrganizationGroupTestOrganization(t, pool, "Group Child A", &rootID)
	childBID := insertOrganizationGroupTestOrganization(t, pool, "Group Child B", &rootID)

	group := &entity.OrganizationGroup{
		OwnerOrganizationID: rootID,
		Name:                "Jawa Timur",
		Description:         "Wilayah Timur",
	}
	if err := repo.Create(ctx, group, []uuid.UUID{childAID, childBID}); err != nil {
		t.Fatalf("Create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM organization_groups WHERE id = $1`, group.ID)
	})

	if group.ID == uuid.Nil {
		t.Fatal("expected generated group id")
	}
	if group.MemberCount != 2 {
		t.Fatalf("expected member count 2, got %d", group.MemberCount)
	}

	got, err := repo.GetByID(ctx, group.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.OwnerOrganizationID != rootID {
		t.Fatalf("expected owner %s, got %s", rootID, got.OwnerOrganizationID)
	}
	if len(got.Members) != 2 {
		t.Fatalf("expected 2 members, got %d", len(got.Members))
	}

	list, total, err := repo.List(ctx, repository.OrganizationGroupListFilter{
		OwnerOrganizationID: &rootID,
		Q:                   "Jawa",
		Page:                1,
		Limit:               10,
		IncludeMembers:      true,
	})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected total 1, got %d", total)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 row, got %d", len(list))
	}
	if len(list[0].Members) != 2 {
		t.Fatalf("expected included members, got %d", len(list[0].Members))
	}

	newChildID := insertOrganizationGroupTestOrganization(t, pool, "Group Child C", &rootID)
	group.Name = "Jawa Timur Update"
	group.Description = "Updated"
	if err := repo.Update(ctx, group, []uuid.UUID{newChildID}); err != nil {
		t.Fatalf("Update: %v", err)
	}

	updated, err := repo.GetByID(ctx, group.ID)
	if err != nil {
		t.Fatalf("GetByID after update: %v", err)
	}
	if updated.Name != "Jawa Timur Update" {
		t.Fatalf("expected updated name, got %q", updated.Name)
	}
	if len(updated.Members) != 1 || updated.Members[0].ID != newChildID {
		t.Fatalf("expected replacement members [%s], got %+v", newChildID, updated.Members)
	}

	memberIDs, err := repo.ListMemberIDs(ctx, group.ID)
	if err != nil {
		t.Fatalf("ListMemberIDs: %v", err)
	}
	if len(memberIDs) != 1 || memberIDs[0] != newChildID {
		t.Fatalf("expected member IDs [%s], got %v", newChildID, memberIDs)
	}

	if err := repo.Delete(ctx, group.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := repo.GetByID(ctx, group.ID); !domainerrors.IsNotFound(err) {
		t.Fatalf("expected not found after delete, got %v", err)
	}
}
