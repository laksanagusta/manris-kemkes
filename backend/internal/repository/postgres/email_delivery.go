package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	identity "github.com/manris/backend/internal/identity/service"
)

func (r *IdentityAuthStore) EnqueueVerification(ctx context.Context, token identity.EmailToken, registration bool) (uuid.UUID, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, fmt.Errorf("begin verification delivery enqueue: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the user before deduplicating requests, including requests made by different app instances.
	var userID uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM users WHERE id=$1 AND email=$2
		AND encode(sha256(convert_to(password_hash, 'UTF8')), 'hex')=$3
		AND status=CASE WHEN $4::boolean THEN 'pending_activation' ELSE 'active' END
		AND email_verified_at IS NULL AND NOT must_change_password
		FOR UPDATE`, token.UserID, token.Email, token.PasswordFingerprint, registration).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, nil
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("lock verification delivery recipient: %w", err)
	}

	var id uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM auth_verification_deliveries
		WHERE user_id=$1 AND email=$2 AND password_fingerprint=$3 AND registration=$4
		AND (status IN ('queued', 'sending', 'retrying')
			OR (status IN ('accepted', 'failed') AND updated_at>clock_timestamp()-interval '2 minutes'))
		ORDER BY created_at DESC, id DESC LIMIT 1`, userID, token.Email, token.PasswordFingerprint, registration).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx, `INSERT INTO auth_verification_deliveries(user_id, email, password_fingerprint, registration)
			VALUES ($1, $2, $3, $4) RETURNING id`, userID, token.Email, token.PasswordFingerprint, registration).Scan(&id)
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("enqueue verification delivery: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, fmt.Errorf("commit verification delivery enqueue: %w", err)
	}
	return id, nil
}

func (r *IdentityAuthStore) ClaimVerification(ctx context.Context) (*identity.VerificationDelivery, error) {
	delivery := identity.VerificationDelivery{Token: identity.EmailToken{Purpose: identity.VerifyEmail}}
	// A sending job becomes claimable again after its lease if the worker exits before recording a result.
	err := r.pool.QueryRow(ctx, `WITH next_delivery AS (
		SELECT id FROM auth_verification_deliveries
		WHERE status IN ('queued', 'sending', 'retrying') AND available_at<=statement_timestamp()
		ORDER BY available_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1
	)
	UPDATE auth_verification_deliveries d
	SET status='sending', attempt=d.attempt+1, available_at=clock_timestamp()+interval '1 minute', updated_at=clock_timestamp()
	FROM next_delivery n WHERE d.id=n.id
	RETURNING d.id, d.user_id, d.email, d.password_fingerprint, d.registration, d.attempt`).Scan(
		&delivery.ID, &delivery.Token.UserID, &delivery.Token.Email, &delivery.Token.PasswordFingerprint,
		&delivery.Registration, &delivery.Attempt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("claim verification delivery: %w", err)
	}
	delivery.Token.DeliveryID = delivery.ID
	delivery.Token.DeliveryAttempt = delivery.Attempt
	return &delivery, nil
}

func (r *IdentityAuthStore) FinishVerification(ctx context.Context, id uuid.UUID, attempt int, status, failure string, retryAfter time.Duration) error {
	tag, err := r.pool.Exec(ctx, `UPDATE auth_verification_deliveries
		SET status=$3, failure=$4, available_at=clock_timestamp()+($5 * interval '1 millisecond'), updated_at=clock_timestamp()
		WHERE id=$1 AND attempt=$2 AND status='sending' AND available_at>clock_timestamp()`,
		id, attempt, status, failure, retryAfter.Milliseconds())
	if err != nil {
		return fmt.Errorf("finish verification delivery: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return errors.New("verification delivery lease lost")
	}
	return nil
}

func (r *IdentityAuthStore) VerificationByID(ctx context.Context, id uuid.UUID) (*identity.VerificationDeliveryStatus, error) {
	var status identity.VerificationDeliveryStatus
	err := r.pool.QueryRow(ctx, `SELECT status, failure FROM auth_verification_deliveries WHERE id=$1`, id).Scan(&status.Status, &status.Failure)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lookup verification delivery: %w", err)
	}
	return &status, nil
}

func (r *IdentityAuthStore) LatestRegistrationVerification(ctx context.Context, userID uuid.UUID) (uuid.UUID, *identity.VerificationDeliveryStatus, error) {
	var id uuid.UUID
	var status identity.VerificationDeliveryStatus
	err := r.pool.QueryRow(ctx, `SELECT d.id, d.status, d.failure
		FROM auth_verification_deliveries d JOIN users u
			ON u.id=d.user_id AND u.email=d.email AND encode(sha256(convert_to(u.password_hash, 'UTF8')), 'hex')=d.password_fingerprint
		WHERE d.user_id=$1 AND d.registration
		ORDER BY d.created_at DESC, d.id DESC LIMIT 1`, userID).Scan(&id, &status.Status, &status.Failure)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, nil, nil
	}
	if err != nil {
		return uuid.Nil, nil, fmt.Errorf("lookup latest registration verification delivery: %w", err)
	}
	return id, &status, nil
}

func (r *IdentityAuthStore) PruneVerificationDeliveries(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM auth_verification_deliveries WHERE id IN (
		SELECT id FROM auth_verification_deliveries
		WHERE status IN ('accepted', 'failed', 'cancelled') AND updated_at<statement_timestamp()-interval '7 days'
		ORDER BY updated_at FOR UPDATE SKIP LOCKED LIMIT 500
	)`)
	if err != nil {
		return fmt.Errorf("prune verification deliveries: %w", err)
	}
	return nil
}
