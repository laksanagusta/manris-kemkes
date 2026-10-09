//go:build integration

package postgres_test

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/identity/domain"
	"github.com/manris/backend/internal/repository/postgres"
	"testing"
)

func TestSharedUserDirectoryPostgresScopeAndPagination(t *testing.T) {
	parent := setupPool(t)
	ctx := context.Background()
	schema := "directory_test_" + uuid.New().String()[:8]
	if _, err := parent.Exec(ctx, `CREATE SCHEMA `+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = parent.Exec(context.Background(), `DROP SCHEMA `+schema+` CASCADE`) })
	cfg := parent.Config().Copy()
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if _, err := pool.Exec(ctx, `CREATE TABLE organizations(id uuid PRIMARY KEY,name text);
 CREATE TABLE users(id uuid PRIMARY KEY,name text,username text,email text,role text,organization_id uuid,status text,nip text,jabatan text,pangkat text,phone_number text,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());`); err != nil {
		t.Fatal(err)
	}
	org, outside := uuid.New(), uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Shared Unit'),($2,'Other Unit')`, org, outside); err != nil {
		t.Fatal(err)
	}
	for _, u := range []struct {
		name, role, status string
		org                *uuid.UUID
	}{
		{"Siti", "reviewer", "active", &org}, {"Budi", "unit", "inactive", &org},
		{"Outside", "unit", "active", &outside}, {"Unassigned", "superadmin", "active", nil},
	} {
		if _, err := pool.Exec(ctx, `INSERT INTO users(id,name,username,email,role,organization_id,status,nip) VALUES($1,$2,$2,$2||'@example.test',$3,$4,$5,'456')`, uuid.New(), u.name, u.role, u.org, u.status); err != nil {
			t.Fatal(err)
		}
	}
	directory := postgres.NewIdentityDirectory(pool)
	for _, tc := range []struct {
		name        string
		filter      domain.DirectoryFilter
		total, size int
	}{
		{"scoped", domain.DirectoryFilter{Page: 1, Limit: 10, AllowedOrgIDs: []uuid.UUID{org}}, 2, 2},
		{"global", domain.DirectoryFilter{Page: 1, Limit: 2, Global: true}, 4, 2},
		{"empty scope fails closed", domain.DirectoryFilter{Page: 1, Limit: 10}, 0, 0},
		{"pagination", domain.DirectoryFilter{Page: 2, Limit: 1, AllowedOrgIDs: []uuid.UUID{org}}, 2, 1},
		{"all filters", domain.DirectoryFilter{Page: 1, Limit: 10, AllowedOrgIDs: []uuid.UUID{org}, OrganizationID: &org, Q: "siti", Role: "reviewer", Status: "active"}, 1, 1},
		{"NIP search", domain.DirectoryFilter{Page: 1, Limit: 10, AllowedOrgIDs: []uuid.UUID{org}, Q: "456"}, 2, 2},
		{"outside organization", domain.DirectoryFilter{Page: 1, Limit: 10, AllowedOrgIDs: []uuid.UUID{org}, OrganizationID: &outside}, 0, 0},
		{"parameterized search", domain.DirectoryFilter{Page: 1, Limit: 10, Global: true, Q: "' OR TRUE --"}, 0, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			users, total, err := directory.ListDirectory(ctx, tc.filter)
			if err != nil {
				t.Fatal(err)
			}
			if total != tc.total || len(users) != tc.size {
				t.Fatalf("total %d size %d; want %d %d", total, len(users), tc.total, tc.size)
			}
			if !tc.filter.Global {
				for _, u := range users {
					if u.OrganizationID == nil || *u.OrganizationID != org {
						t.Fatal("scope leaked")
					}
				}
			}
		})
	}
}
