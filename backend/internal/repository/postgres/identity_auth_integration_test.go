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
	useruc "github.com/manris/backend/internal/usecase/user"
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
        CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,username text,email text,password_hash text,role text,organization_id uuid,status text,must_change_password boolean,nip text,jabatan text,pangkat text,phone_number text,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),last_logged_in timestamptz DEFAULT NOW());
        CREATE TABLE audit_logs(actor_user_id uuid,entity_type text,entity_id uuid,action text);`)
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
	execIdentityMigration(t, pool, "000091_password_reset.up.sql")
	execIdentityMigration(t, pool, "000092_email_password_reset.up.sql")
	execIdentityMigration(t, pool, "000093_verification_email_delivery.up.sql")
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
	testPasswordResetLifecycle(t, pool, svc, actor, orgID, string(hash))
	testEmailRecoveryLifecycle(t, pool, svc, orgID, string(hash))
	testAdminCreatedAccountActivation(t, pool, svc, orgID)
	execIdentityMigration(t, pool, "000093_verification_email_delivery.down.sql")
	execIdentityMigration(t, pool, "000092_email_password_reset.down.sql")
	execIdentityMigration(t, pool, "000091_password_reset.down.sql")
	down, err := os.ReadFile("../../../db/migrations/000071_shared_identity_auth.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, string(down)); err != nil {
		t.Fatal(err)
	}
}

func execIdentityMigration(t *testing.T, pool *pgxpool.Pool, name string) {
	t.Helper()
	migration, err := os.ReadFile("../../../db/migrations/" + name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), string(migration)); err != nil {
		t.Fatal(err)
	}
}

func testAdminCreatedAccountActivation(t *testing.T, pool *pgxpool.Pool, auth *identity.Service, orgID uuid.UUID) {
	t.Helper()
	ctx := t.Context()
	users := postgres.NewUserRepository(pool)

	const nip = "78911"
	const temporary = "Temporary123!"
	const permanent = "Permanent123!"
	created, err := useruc.NewCreateUserUseCase(users, postgres.NewOrganizationRepository(pool)).Execute(ctx, useruc.CreateUserInput{
		Name: "Administrator-created account", Email: "provisioned@example.test", NIP: nip,
		Password: temporary, Role: domain.RoleUnit, OrganizationID: &orgID,
	})
	if err != nil {
		t.Fatalf("create provisioned account: %v", err)
	}
	if _, err := auth.Login(ctx, domain.ManrisApplication, nip, temporary); !errors.Is(err, domainerrors.ErrAccountPendingApproval) {
		t.Fatalf("expected account to wait for approval, got %v", err)
	}
	if _, err := useruc.NewApproveRegistrationUseCase(users).Execute(ctx, created.ID); err != nil {
		t.Fatalf("approve provisioned account: %v", err)
	}
	setup, err := auth.Login(ctx, domain.ManrisApplication, nip, temporary)
	if err != nil || setup.SessionMode != "setup" || setup.User.EmailVerified {
		t.Fatalf("expected a password setup session for the provisioned account: %v", err)
	}
	if _, err := auth.Login(ctx, "recovery_test", nip, temporary); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("temporary password must only open a Manris setup session: %v", err)
	}
	full, err := auth.ChangePassword(ctx, domain.ManrisApplication, setup.Token, "", permanent, permanent)
	if err != nil || full.SessionMode != "full" || full.MustChangePassword {
		t.Fatalf("expected a full session after password setup: %v", err)
	}
	if _, err := auth.Login(ctx, domain.ManrisApplication, nip, temporary); !errors.Is(err, domainerrors.ErrInvalidCredentials) {
		t.Fatalf("temporary password remained valid: %v", err)
	}
	if _, err := auth.Login(ctx, domain.ManrisApplication, nip, permanent); err != nil {
		t.Fatalf("sign in with the permanent password: %v", err)
	}
}

func testPasswordResetLifecycle(t *testing.T, pool *pgxpool.Pool, svc *identity.Service, actor, orgID uuid.UUID, hash string) {
	t.Helper()
	ctx := context.Background()
	target := uuid.New()
	if _, err := pool.Exec(ctx, `UPDATE users SET password_hash=$2 WHERE id=$1`, actor, hash); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,status,must_change_password,nip,jabatan,pangkat,phone_number,organization_id)
		VALUES($1,'Unit','unit','unit@example.test',$2,'unit','active',FALSE,'456','','','',$3)`, target, hash, orgID); err != nil {
		t.Fatal(err)
	}
	external, err := svc.CreateApplication(ctx, "recovery_test", "Recovery test", actor)
	if err != nil {
		t.Fatal(err)
	}

	oldSessions := map[string]string{}
	for _, appID := range []string{domain.ManrisApplication, external.Application.ID} {
		initial, err := svc.Login(ctx, appID, "456", "Password123!")
		if err != nil {
			t.Fatal(err)
		}
		oldSessions[appID] = initial.Token
	}
	stale, err := postgres.NewUserRepository(pool).GetByID(ctx, target)
	if err != nil {
		t.Fatal(err)
	}
	result, err := svc.ResetPassword(ctx, actor, target, "Password123!")
	if err != nil {
		t.Fatal(err)
	}
	if err := postgres.NewUserRepository(pool).Update(ctx, stale); !errors.Is(err, domainerrors.ErrConflict) {
		t.Fatalf("expected stale user edit to fail, got %v", err)
	}
	var revoked, audited int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM auth_sessions WHERE user_id=$1 AND revoked_at IS NOT NULL`, target).Scan(&revoked); err != nil || revoked != 2 {
		t.Fatalf("expected two revoked sessions, got %d (%v)", revoked, err)
	}
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE actor_user_id=$1 AND entity_id=$2 AND entity_type='user' AND action='reset_password'`, actor, target).Scan(&audited); err != nil || audited != 1 {
		t.Fatalf("expected one audit event, got %d (%v)", audited, err)
	}
	for appID, token := range oldSessions {
		if _, err := svc.Validate(ctx, appID, token); !errors.Is(err, domainerrors.ErrUnauthorized) {
			t.Fatalf("%s session remained valid: %v", appID, err)
		}
	}
	if _, err := svc.Login(ctx, domain.ManrisApplication, "456", "Password123!"); !errors.Is(err, domainerrors.ErrInvalidCredentials) {
		t.Fatalf("previous password remained valid: %v", err)
	}
	if _, err := svc.Login(ctx, external.Application.ID, "456", result.TemporaryPassword); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("temporary password was accepted by external application: %v", err)
	}
	setup, err := svc.Login(ctx, domain.ManrisApplication, "456", result.TemporaryPassword)
	if err != nil || setup.SessionMode != "setup" {
		t.Fatalf("expected setup session: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE users SET temporary_password_expires_at=NOW()-interval '1 minute' WHERE id=$1`, target); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Login(ctx, domain.ManrisApplication, "456", result.TemporaryPassword); !errors.Is(err, domainerrors.ErrInvalidCredentials) {
		t.Fatalf("expired password accepted: %v", err)
	}
	const next = "Replacement123!"
	if _, err := svc.ChangePassword(ctx, domain.ManrisApplication, setup.Token, "", next, next); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("expired setup session accepted: %v", err)
	}
	result, err = svc.ResetPassword(ctx, actor, target, "Password123!")
	if err != nil {
		t.Fatal(err)
	}
	setup, err = svc.Login(ctx, domain.ManrisApplication, "456", result.TemporaryPassword)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ChangePassword(ctx, domain.ManrisApplication, setup.Token, "", result.TemporaryPassword, result.TemporaryPassword); !errors.Is(err, identity.ErrInvalidResetPassword) {
		t.Fatalf("temporary password could be reused as the permanent password: %v", err)
	}
	full, err := svc.ChangePassword(ctx, domain.ManrisApplication, setup.Token, "", next, next)
	if err != nil || full.SessionMode != "full" {
		t.Fatalf("expected full session after replacement: %v", err)
	}
	if _, err := svc.Login(ctx, external.Application.ID, "456", next); err != nil {
		t.Fatalf("expected external login with the replacement password: %v", err)
	}
}
