//go:build integration

package postgres_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	identity "github.com/manris/backend/internal/identity/service"
	"github.com/manris/backend/internal/repository/postgres"
	"golang.org/x/crypto/bcrypt"
	"os"
	"testing"
	"time"
)

func TestIdentityAuthPostgresMigrationAndLifecycle(t *testing.T) {
	parent := setupPool(t)
	ctx := context.Background()
	schema := "identity_test_" + uuid.New().String()[:8]
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
	_, err = pool.Exec(ctx, `CREATE TABLE organizations(id uuid PRIMARY KEY,name text,parent_id uuid,upr_level text,location text,address text,created_at timestamptz DEFAULT NOW());
        CREATE TABLE users(id uuid PRIMARY KEY,name text,username text,email text,password_hash text,role text,organization_id uuid,status text,must_change_password boolean,nip text,jabatan text,pangkat text,phone_number text,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),last_logged_in timestamptz DEFAULT NOW());`)
	if err != nil {
		t.Fatal(err)
	}
	migration, err := os.ReadFile("../../../db/migrations/000071_shared_identity_auth.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, string(migration)); err != nil {
		t.Fatal(err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	actor := uuid.New()
	_, err = pool.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,status,must_change_password,nip,jabatan,pangkat,phone_number) VALUES($1,'Dika','dika','dummy@example.test',$2,'superadmin','active',FALSE,'123','','','')`, actor, string(hash))
	if err != nil {
		t.Fatal(err)
	}
	store := postgres.NewIdentityAuthStore(pool)
	svc, err := identity.New(store, postgres.NewIdentityDirectory(pool), postgres.NewOrganizationRepository(pool), "dummy-secret-for-identity-integration-32", time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	generated, err := svc.CreateApplication(ctx, "products", "Products", actor)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CreateApplication(ctx, "products", "Duplicate", actor); !errors.Is(err, domainerrors.ErrConflict) {
		t.Fatalf("duplicate app: %v", err)
	}
	if _, err := svc.LoginWithKey(ctx, generated.AppKey, "missing", "Password123!"); !errors.Is(err, domainerrors.ErrInvalidCredentials) {
		t.Fatalf("unknown user should reject credentials: %v", err)
	}
	session, err := svc.LoginWithKey(ctx, generated.AppKey, "123", "Password123!")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ValidateWithKey(ctx, generated.AppKey, session.Token); err != nil {
		t.Fatal(err)
	}
	key, err := svc.RotateKey(ctx, "products", actor)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ValidateWithKey(ctx, generated.AppKey, session.Token); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("old key accepted: %v", err)
	}
	if _, err := svc.ValidateWithKey(ctx, key, session.Token); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("old session survived rotation: %v", err)
	}
	session, err = svc.LoginWithKey(ctx, key, "123", "Password123!")
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.Logout(ctx, "products", session.Token); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ValidateWithKey(ctx, key, session.Token); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("logout failed: %v", err)
	}
	session, err = svc.LoginWithKey(ctx, key, "123", "Password123!")
	if err != nil {
		t.Fatal(err)
	}
	orgID, childID := uuid.New(), uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Direktorat A')`, orgID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO organizations(id,name,parent_id) VALUES($1,'Unit A',$2)`, childID, orgID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE users SET role='reviewer',organization_id=$2 WHERE id=$1`, actor, orgID); err != nil {
		t.Fatal(err)
	}
	i, err := svc.ValidateWithKey(ctx, key, session.Token)
	if err != nil {
		t.Fatal(err)
	}
	if i.Profile.Role != "reviewer" || len(i.Profile.AccessibleOrgIDs) != 2 || i.Profile.Organization.Name != "Direktorat A" {
		t.Fatal("shared directory is stale")
	}
	directory := postgres.NewIdentityDirectory(pool)
	if err := directory.UpdateProfile(ctx, actor, domain.ProfileUpdate{Name: "Updated", Email: "updated@example.test", NIP: "123"}); err != nil {
		t.Fatal(err)
	}
	u, err := directory.GetByID(ctx, actor)
	if err != nil {
		t.Fatal(err)
	}
	if u.Role != "reviewer" || u.OrganizationID == nil || *u.OrganizationID != orgID {
		t.Fatal("profile update overwrote role or organization")
	}
	if err := directory.ChangePassword(ctx, actor, "wrong-expected-hash", "new-hash"); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatal("password update skipped credential snapshot check")
	}
	if err := directory.ChangePassword(ctx, actor, string(hash), "new-hash"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ValidateWithKey(ctx, key, session.Token); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatal("password change did not revoke session")
	}
	if _, err := pool.Exec(ctx, `UPDATE users SET role='superadmin' WHERE id=$1`, actor); err != nil {
		t.Fatal(err)
	}
	if err := svc.DisableApplication(ctx, "products", actor); err != nil {
		t.Fatal(err)
	}
	apps, err := svc.ListApplications(ctx, actor)
	if err != nil || len(apps) != 2 {
		t.Fatalf("list apps: %v %v", apps, err)
	}
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM auth_application_events`).Scan(&count); err != nil || count != 3 {
		t.Fatalf("missing audit events: %d %v", count, err)
	}
	down, err := os.ReadFile("../../../db/migrations/000071_shared_identity_auth.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, string(down)); err != nil {
		t.Fatal(err)
	}
}
