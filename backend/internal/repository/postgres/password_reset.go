package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func (r *IdentityAuthStore) ResetPassword(ctx context.Context, actor, target uuid.UUID, actorHash, targetHash, newHash string, expiresAt time.Time) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin password reset: %w", err)
	}
	defer tx.Rollback(ctx)

	var allowed bool
	err = tx.QueryRow(ctx, `SELECT true FROM users
		WHERE id=$1 AND password_hash=$2 AND status='active' AND NOT must_change_password
		AND role IN ('superadmin', 'super_admin', 'admin') FOR UPDATE`, actor, actorHash).Scan(&allowed)
	if errors.Is(err, pgx.ErrNoRows) {
		return domainerrors.ErrForbidden
	}
	if err != nil {
		return fmt.Errorf("verify password reset actor: %w", err)
	}

	tag, err := tx.Exec(ctx, `UPDATE users
		SET password_hash=$3, must_change_password=TRUE, temporary_password_expires_at=$4, updated_at=clock_timestamp()
		WHERE id=$1 AND password_hash=$2 AND status='active'`, target, targetHash, newHash, expiresAt)
	if err != nil {
		return fmt.Errorf("set temporary password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrConflict
	}
	if _, err := tx.Exec(ctx, `UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, target); err != nil {
		return fmt.Errorf("revoke sessions after password reset: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action)
		VALUES ($1, 'user', $2, 'reset_password')`, actor, target); err != nil {
		return fmt.Errorf("audit password reset: %w", err)
	}
	return tx.Commit(ctx)
}
