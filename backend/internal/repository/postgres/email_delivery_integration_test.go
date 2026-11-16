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
	identity "github.com/manris/backend/internal/identity/service"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestVerificationDeliveryLeaseAndRetry(t *testing.T) {
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
		id uuid PRIMARY KEY, email text NOT NULL, password_hash text NOT NULL,
		status text NOT NULL, must_change_password boolean NOT NULL
	)`); err != nil {
		t.Fatal(err)
	}
	execIdentityMigration(t, pool, "000092_email_password_reset.up.sql")
	execIdentityMigration(t, pool, "000093_verification_email_delivery.up.sql")

	token := identity.EmailToken{
		UserID: uuid.New(), Purpose: identity.VerifyEmail, Email: "applicant@example.test",
		PasswordFingerprint: fmt.Sprintf("%x", sha256.Sum256([]byte("dummy-password-hash"))),
	}
	if _, err := pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, status, must_change_password)
		VALUES ($1, $2, 'dummy-password-hash', 'pending_activation', FALSE)`, token.UserID, token.Email); err != nil {
		t.Fatal(err)
	}
	store := postgres.NewIdentityAuthStore(pool)
	id, err := store.EnqueueVerification(ctx, token, true)
	if err != nil || id == uuid.Nil {
		t.Fatalf("enqueue: %v, %v", id, err)
	}
	otherWorker := postgres.NewIdentityAuthStore(pool)
	duplicate, err := otherWorker.EnqueueVerification(ctx, token, true)
	if err != nil || duplicate != id {
		t.Fatalf("duplicate enqueue: %v, %v", duplicate, err)
	}
	first, err := otherWorker.ClaimVerification(ctx)
	if err != nil || first == nil || first.ID != id || first.Attempt != 1 {
		t.Fatalf("initial claim: %+v, %v", first, err)
	}
	if claim, err := store.ClaimVerification(ctx); err != nil || claim != nil {
		t.Fatalf("active lease must prevent another claim: %+v, %v", claim, err)
	}
	first.Token.Hash = strings.Repeat("a", 64)
	if created, err := store.IssueEmailToken(ctx, first.Token, 30*time.Minute); err != nil || !created {
		t.Fatalf("initial token: %t, %v", created, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_verification_deliveries SET available_at=clock_timestamp() WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	second, err := store.ClaimVerification(ctx)
	if err != nil || second == nil || second.ID != id || second.Attempt != 2 {
		t.Fatalf("reclaimed lease: %+v, %v", second, err)
	}
	first.Token.Hash = strings.Repeat("b", 64)
	if created, err := otherWorker.IssueEmailToken(ctx, first.Token, 30*time.Minute); err != nil || created {
		t.Fatalf("stale claim issued an email token: %t, %v", created, err)
	}
	second.Token.Hash = strings.Repeat("c", 64)
	if created, err := store.IssueEmailToken(ctx, second.Token, 30*time.Minute); err != nil || !created {
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
	latestID, status, err := store.LatestRegistrationVerification(ctx, token.UserID)
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
	if duplicate, err := store.EnqueueVerification(ctx, token, true); err != nil || duplicate != id {
		t.Fatalf("immediate resend after failure must respect cooldown: %v, %v", duplicate, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE users SET email='changed@example.test' WHERE id=$1`, token.UserID); err != nil {
		t.Fatal(err)
	}
	if id, status, err := store.LatestRegistrationVerification(ctx, token.UserID); err != nil || id != uuid.Nil || status != nil {
		t.Fatalf("obsolete delivery was returned: %v, %+v, %v", id, status, err)
	}
}
