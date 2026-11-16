//go:build integration

package postgres_test

import (
	"context"
	"crypto/sha256"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/identity/domain"
	identity "github.com/manris/backend/internal/identity/service"
	"github.com/manris/backend/internal/repository/postgres"
)

func setupVerificationDeliveryPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	parent := setupPool(t)
	ctx := t.Context()
	schema := "verification_delivery_test_" + uuid.NewString()[:8]
	if _, err := parent.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := parent.Exec(context.Background(), "DROP SCHEMA "+schema+" CASCADE"); err != nil {
			t.Error(err)
		}
	})
	cfg := parent.Config()
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	if _, err := pool.Exec(ctx, `CREATE TABLE users (
		id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, password_hash text NOT NULL,
		status text NOT NULL, must_change_password boolean NOT NULL, name text, username text,
		role text, organization_id uuid, nip text, jabatan text, pangkat text, phone_number text,
		created_at timestamptz, updated_at timestamptz, last_logged_in timestamptz
	)`); err != nil {
		t.Fatal(err)
	}
	execIdentityMigration(t, pool, "000092_email_password_reset.up.sql")
	execIdentityMigration(t, pool, "000093_verification_email_delivery.up.sql")
	return pool
}

func TestRegisterPendingWithVerificationRollsBackWhenEnqueueFails(t *testing.T) {
	pool := setupVerificationDeliveryPool(t)
	ctx := t.Context()
	store := postgres.NewIdentityAuthStore(pool)
	user := &domain.User{
		Name: "Applicant", Email: "atomic@example.test", Username: "123", NIP: "123",
		PasswordHash: "dummy-password-hash", Status: domain.UserStatusPendingActivation, Role: domain.RoleUnit,
	}
	if _, err := pool.Exec(ctx, `ALTER TABLE auth_verification_deliveries ADD CONSTRAINT reject_delivery CHECK (FALSE)`); err != nil {
		t.Fatal(err)
	}
	if id, err := store.RegisterPendingWithVerification(ctx, user); err == nil || id != uuid.Nil {
		t.Fatalf("registration must fail when enqueue fails: %v, %v", id, err)
	}
	if user.ID != uuid.Nil || !user.CreatedAt.IsZero() {
		t.Fatal("failed registration exposed uncommitted account metadata")
	}
	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("enqueue failure left a user behind: %d, %v", count, err)
	}
	if _, err := pool.Exec(ctx, `ALTER TABLE auth_verification_deliveries DROP CONSTRAINT reject_delivery`); err != nil {
		t.Fatal(err)
	}
	id, err := store.RegisterPendingWithVerification(ctx, user)
	if err != nil || id == uuid.Nil || user.ID == uuid.Nil || user.CreatedAt.IsZero() {
		t.Fatalf("registration did not expose its committed metadata and receipt: %v, %v", id, err)
	}
	if receipt, status, err := store.LatestRegistrationVerification(ctx, user.ID); err != nil ||
		receipt != id || status == nil || status.Status != "queued" {
		t.Fatalf("registration receipt is not queued: %v, %+v, %v", receipt, status, err)
	}
}

func TestResetEmailTokenCooldownWithoutVerificationQueue(t *testing.T) {
	pool := setupVerificationDeliveryPool(t)
	ctx := t.Context()
	if _, err := pool.Exec(ctx, `DROP TABLE auth_verification_deliveries`); err != nil {
		t.Fatal(err)
	}
	token := identity.EmailToken{
		EmailRecipient: identity.EmailRecipient{
			UserID: uuid.New(), Email: "reset@example.test",
			PasswordFingerprint: fmt.Sprintf("%x", sha256.Sum256([]byte("dummy-password-hash"))),
		},
		Hash: strings.Repeat("a", 64),
	}
	if _, err := pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, status, must_change_password, email_verified_at)
		VALUES ($1, $2, 'dummy-password-hash', 'active', FALSE, clock_timestamp())`, token.UserID, token.Email); err != nil {
		t.Fatal(err)
	}
	store := postgres.NewIdentityAuthStore(pool)
	if created, err := store.IssueResetEmailToken(ctx, token, 30*time.Minute); err != nil || !created {
		t.Fatalf("reset token requires no verification queue: %t, %v", created, err)
	}
	token.Hash = strings.Repeat("b", 64)
	if created, err := store.IssueResetEmailToken(ctx, token, 30*time.Minute); err != nil || created {
		t.Fatalf("reset token remains subject to cooldown: %t, %v", created, err)
	}
}

func TestVerificationDeliveryLeaseAndRetry(t *testing.T) {
	pool := setupVerificationDeliveryPool(t)
	ctx := t.Context()
	recipient := identity.EmailRecipient{
		UserID: uuid.New(), Email: "applicant@example.test",
		PasswordFingerprint: fmt.Sprintf("%x", sha256.Sum256([]byte("dummy-password-hash"))),
	}
	if _, err := pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, status, must_change_password)
		VALUES ($1, $2, 'dummy-password-hash', 'pending_activation', FALSE)`, recipient.UserID, recipient.Email); err != nil {
		t.Fatal(err)
	}
	store := postgres.NewIdentityAuthStore(pool)
	scheduled, err := store.EnqueueVerification(ctx, recipient, true)
	id := scheduled.DeliveryID
	if err != nil || id == uuid.Nil || scheduled.Outcome != identity.VerificationScheduled || scheduled.Status != "queued" {
		t.Fatalf("enqueue: %+v, %v", scheduled, err)
	}
	otherWorker := postgres.NewIdentityAuthStore(pool)
	duplicate, err := otherWorker.EnqueueVerification(ctx, recipient, true)
	if err != nil || duplicate.DeliveryID != id || duplicate.Outcome != identity.VerificationExisting || duplicate.RetryAt != nil {
		t.Fatalf("duplicate enqueue: %+v, %v", duplicate, err)
	}
	first, err := otherWorker.ClaimVerification(ctx)
	if err != nil || first == nil || first.ID != id || first.Attempt != 1 {
		t.Fatalf("initial claim: %+v, %v", first, err)
	}
	if claim, err := store.ClaimVerification(ctx); err != nil || claim != nil {
		t.Fatalf("active lease must prevent another claim: %+v, %v", claim, err)
	}
	if created, err := store.IssueVerificationEmailToken(ctx, *first, strings.Repeat("a", 64), 30*time.Minute); err != nil || !created {
		t.Fatalf("initial token: %t, %v", created, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_verification_deliveries SET available_at=clock_timestamp() WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	second, err := store.ClaimVerification(ctx)
	if err != nil || second == nil || second.ID != id || second.Attempt != 2 {
		t.Fatalf("reclaimed lease: %+v, %v", second, err)
	}
	if created, err := otherWorker.IssueVerificationEmailToken(ctx, *first, strings.Repeat("b", 64), 30*time.Minute); err != nil || created {
		t.Fatalf("stale claim issued an email token: %t, %v", created, err)
	}
	if created, err := store.IssueVerificationEmailToken(ctx, *second, strings.Repeat("c", 64), 30*time.Minute); err != nil || !created {
		t.Fatalf("leased retry could not issue a fresh token: %t, %v", created, err)
	}
	if err := otherWorker.FinishVerification(ctx, id, first.Attempt, "accepted", "", 0); err == nil {
		t.Fatal("outdated lease accepted a result")
	}
	status, err := store.VerificationByID(ctx, id)
	if err != nil || status == nil || status.Status != "sending" {
		t.Fatalf("stale claim changed the status: %+v, %v", status, err)
	}
	if err := store.FinishVerification(ctx, id, second.Attempt, "retrying", "temporary", time.Minute); err != nil {
		t.Fatal(err)
	}
	latestID, status, err := store.LatestRegistrationVerification(ctx, recipient.UserID)
	if err != nil || latestID != id || status == nil || status.Status != "retrying" || status.Failure != "temporary" {
		t.Fatalf("latest delivery: %v, %+v, %v", latestID, status, err)
	}
	if claim, err := store.ClaimVerification(ctx); err != nil || claim != nil {
		t.Fatalf("backoff must delay the next claim: %+v, %v", claim, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_verification_deliveries SET available_at=clock_timestamp() WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	third, err := store.ClaimVerification(ctx)
	if err != nil || third == nil || third.ID != id {
		t.Fatalf("claim after retry: %+v, %v", third, err)
	}
	if err := store.FinishVerification(ctx, id, third.Attempt, "failed", "recipient", 0); err != nil {
		t.Fatal(err)
	}
	cooldown, err := store.EnqueueVerification(ctx, recipient, true)
	if err != nil || cooldown.DeliveryID != id || cooldown.Outcome != identity.VerificationCooldown ||
		cooldown.Status != "failed" || cooldown.Failure != "recipient" || cooldown.RetryAt == nil || !cooldown.RetryAt.After(time.Now()) {
		t.Fatalf("immediate resend after failure must report cooldown: %+v, %v", cooldown, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_verification_deliveries SET updated_at=clock_timestamp()-interval '3 minutes' WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	rescheduled, err := store.EnqueueVerification(ctx, recipient, true)
	if err != nil || rescheduled.DeliveryID == id || rescheduled.Outcome != identity.VerificationScheduled || rescheduled.RetryAt != nil {
		t.Fatalf("resend after cooldown must return a new job: %+v, %v", rescheduled, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE users SET email='changed@example.test' WHERE id=$1`, recipient.UserID); err != nil {
		t.Fatal(err)
	}
	if id, status, err := store.LatestRegistrationVerification(ctx, recipient.UserID); err != nil || id != uuid.Nil || status != nil {
		t.Fatalf("obsolete delivery was returned: %v, %+v, %v", id, status, err)
	}
	if unavailable, err := store.EnqueueVerification(ctx, recipient, true); err != nil ||
		unavailable.Outcome != identity.VerificationUnavailable || unavailable.DeliveryID != uuid.Nil || unavailable.Status != "unknown" {
		t.Fatalf("obsolete recipient must produce an unavailable result: %+v, %v", unavailable, err)
	}
}
