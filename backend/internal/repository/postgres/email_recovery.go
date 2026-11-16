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

var _ identity.EmailRecoveryStore = (*IdentityAuthStore)(nil)

func (r *IdentityAuthStore) IssueResetEmailToken(ctx context.Context, token identity.EmailToken, lifetime time.Duration) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin reset email token issuance: %w", err)
	}
	defer tx.Rollback(ctx)

	// Check cooldown after acquiring the user lock, so it sees any concurrent issuance.
	var id uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM users
		WHERE id=$1 AND email=$2 AND encode(sha256(convert_to(password_hash, 'UTF8')), 'hex')=$3
		AND status='active' AND email_verified_at IS NOT NULL
		FOR UPDATE`, token.UserID, token.Email, token.PasswordFingerprint).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("lock reset email token recipient: %w", err)
	}

	var onCooldown bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM auth_email_tokens
		WHERE user_id=$1 AND purpose=$2 AND created_at>clock_timestamp()-interval '2 minutes'
		AND expires_at>clock_timestamp())`, id, identity.ResetByEmail).Scan(&onCooldown); err != nil {
		return false, fmt.Errorf("check reset email token cooldown: %w", err)
	}
	if onCooldown {
		return false, nil
	}
	if err := insertEmailToken(ctx, tx, token, identity.ResetByEmail, lifetime); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}

func (r *IdentityAuthStore) IssueVerificationEmailToken(ctx context.Context, delivery identity.VerificationDelivery, hash string, lifetime time.Duration) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin verification email token issuance: %w", err)
	}
	defer tx.Rollback(ctx)

	recipient := delivery.Recipient
	// Keep the account snapshot and the current lease stable until the token has committed.
	var id uuid.UUID
	err = tx.QueryRow(ctx, `SELECT u.id FROM users u
		JOIN auth_verification_deliveries d ON d.user_id=u.id AND d.email=u.email
			AND d.password_fingerprint=encode(sha256(convert_to(u.password_hash, 'UTF8')), 'hex')
		WHERE d.id=$1 AND d.attempt=$2 AND d.status='sending' AND d.available_at>clock_timestamp()
		AND d.user_id=$3 AND d.email=$4 AND d.password_fingerprint=$5
		AND u.status IN ('active', 'pending_activation') AND u.email_verified_at IS NULL AND NOT u.must_change_password
		FOR UPDATE OF u FOR SHARE OF d`,
		delivery.ID, delivery.Attempt, recipient.UserID, recipient.Email, recipient.PasswordFingerprint).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("lock verification email token recipient and claim: %w", err)
	}

	token := identity.EmailToken{EmailRecipient: recipient, Hash: hash}
	if err := insertEmailToken(ctx, tx, token, identity.VerifyEmail, lifetime); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}

func insertEmailToken(ctx context.Context, tx pgx.Tx, token identity.EmailToken, purpose string, lifetime time.Duration) error {
	if _, err := tx.Exec(ctx, `DELETE FROM auth_email_tokens WHERE user_id=$1 AND expires_at<=clock_timestamp()`, token.UserID); err != nil {
		return fmt.Errorf("remove expired email tokens: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO auth_email_tokens(token_hash, user_id, purpose, email, password_fingerprint, expires_at)
		VALUES ($1, $2, $3, $4, $5, clock_timestamp()+make_interval(secs => $6))`,
		token.Hash, token.UserID, purpose, token.Email, token.PasswordFingerprint, lifetime.Seconds()); err != nil {
		return fmt.Errorf("issue email token: %w", err)
	}
	return nil
}

const matchingEmailToken = `
	t.token_hash=$1 AND t.purpose=$2 AND t.expires_at>clock_timestamp()
	AND u.id=t.user_id AND u.email=t.email
	AND t.password_fingerprint=encode(sha256(convert_to(u.password_hash, 'UTF8')), 'hex')`

func (r *IdentityAuthStore) UsableResetToken(ctx context.Context, hash string) (bool, error) {
	var usable bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(
		SELECT 1 FROM users u, auth_email_tokens t
		WHERE `+matchingEmailToken+` AND u.status='active' AND u.email_verified_at IS NOT NULL)`, hash, identity.ResetByEmail).Scan(&usable)
	return usable, err
}

func (r *IdentityAuthStore) ConsumeEmailToken(ctx context.Context, hash, purpose, newPasswordHash string) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin email confirmation: %w", err)
	}
	defer tx.Rollback(ctx)

	var id uuid.UUID
	var pendingApproval bool
	switch purpose {
	case identity.VerifyEmail:
		err = tx.QueryRow(ctx, `UPDATE users u SET email_verified_at=clock_timestamp(), updated_at=clock_timestamp()
			FROM auth_email_tokens t WHERE `+matchingEmailToken+`
			AND u.status IN ('active', 'pending_activation') AND u.email_verified_at IS NULL AND NOT u.must_change_password
			RETURNING u.id, u.status='pending_activation'`, hash, purpose).Scan(&id, &pendingApproval)
	case identity.ResetByEmail:
		err = tx.QueryRow(ctx, `UPDATE users u
			SET password_hash=$3, must_change_password=FALSE, temporary_password_expires_at=NULL, updated_at=clock_timestamp()
			FROM auth_email_tokens t WHERE `+matchingEmailToken+`
			AND u.status='active' AND u.email_verified_at IS NOT NULL
			RETURNING u.id`, hash, purpose, newPasswordHash).Scan(&id)
	default:
		return false, identity.ErrInvalidEmailToken
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return false, identity.ErrInvalidEmailToken
	}
	if err != nil {
		return false, fmt.Errorf("confirm email token: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM auth_email_tokens WHERE user_id=$1`, id); err != nil {
		return false, fmt.Errorf("consume email tokens: %w", err)
	}
	if purpose == identity.ResetByEmail {
		if _, err := tx.Exec(ctx, `UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, id); err != nil {
			return false, fmt.Errorf("revoke sessions after email reset: %w", err)
		}
	}
	if _, err := tx.Exec(ctx, `INSERT INTO audit_logs(actor_user_id, entity_type, entity_id, action)
		VALUES ($1, 'user', $1, $2)`, id, purpose); err != nil {
		return false, fmt.Errorf("audit email confirmation: %w", err)
	}
	return pendingApproval, tx.Commit(ctx)
}
