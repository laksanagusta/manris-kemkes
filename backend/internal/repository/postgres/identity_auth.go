package postgres

import (
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	identity "github.com/manris/backend/internal/identity/service"
)

type IdentityAuthStore struct{ pool *pgxpool.Pool }

var _ identity.Store = (*IdentityAuthStore)(nil)

func NewIdentityAuthStore(pool *pgxpool.Pool) *IdentityAuthStore {
	return &IdentityAuthStore{pool: pool}
}
func scanApplication(row pgx.Row) (*domain.Application, error) {
	a := &domain.Application{}
	err := row.Scan(&a.ID, &a.Name, &a.Active, &a.KeyHash, &a.KeyVersion, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrUnauthorized
	}
	if err != nil {
		return nil, fmt.Errorf("read identity application: %w", err)
	}
	return a, nil
}

const appColumns = `id,name,active,COALESCE(key_hash,''),key_version,created_at,updated_at`

func (r *IdentityAuthStore) Application(ctx context.Context, id string) (*domain.Application, error) {
	return scanApplication(r.pool.QueryRow(ctx, `SELECT `+appColumns+` FROM auth_applications WHERE id=$1 AND active`, id))
}
func (r *IdentityAuthStore) ApplicationByKey(ctx context.Context, hash string) (*domain.Application, error) {
	return scanApplication(r.pool.QueryRow(ctx, `SELECT `+appColumns+` FROM auth_applications WHERE key_hash=$1 AND active`, hash))
}
func (r *IdentityAuthStore) CreateApplication(ctx context.Context, a *domain.Application, actor uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	err = tx.QueryRow(ctx, `INSERT INTO auth_applications(id,name,key_hash,created_by,updated_by) VALUES($1,$2,$3,$4,$4) RETURNING created_at,updated_at`, a.ID, a.Name, a.KeyHash, actor).Scan(&a.CreatedAt, &a.UpdatedAt)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return domainerrors.ErrConflict
	}
	if err != nil {
		return err
	}
	if err := auditApplication(ctx, tx, a.ID, actor, "create"); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func auditApplication(ctx context.Context, tx pgx.Tx, id string, actor uuid.UUID, action string) error {
	_, err := tx.Exec(ctx, `INSERT INTO auth_application_events(id,application_id,actor_id,action) VALUES($1,$2,$3,$4)`, uuid.New(), id, actor, action)
	return err
}
func (r *IdentityAuthStore) ListApplications(ctx context.Context) ([]*domain.Application, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+appColumns+` FROM auth_applications ORDER BY created_at,id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	apps := make([]*domain.Application, 0)
	for rows.Next() {
		a, err := scanApplication(rows)
		if err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, rows.Err()
}
func (r *IdentityAuthStore) RotateKey(ctx context.Context, id, hash string, actor uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `UPDATE auth_applications SET key_hash=$2,key_version=key_version+1,updated_by=$3,updated_at=NOW() WHERE id=$1 AND active`, id, hash, actor)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	if err := auditApplication(ctx, tx, id, actor, "rotate_key"); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (r *IdentityAuthStore) DisableApplication(ctx context.Context, id string, actor uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `UPDATE auth_applications SET active=FALSE,key_version=key_version+1,updated_by=$2,updated_at=NOW() WHERE id=$1 AND id<>'manris'`, id, actor)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	if err := auditApplication(ctx, tx, id, actor, "disable"); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (r *IdentityAuthStore) CreateSession(ctx context.Context, s *domain.Session) error {
	// Validate the current application version even when rotation races with login.
	tag, err := r.pool.Exec(ctx, `INSERT INTO auth_sessions(id,application_id,user_id,key_version,password_fingerprint,expires_at)
        SELECT $1,id,$3,$4,$5,$6 FROM auth_applications WHERE id=$2 AND key_version=$4 AND active`, s.ID, s.ApplicationID, s.UserID, s.KeyVersion, s.PasswordFingerprint, s.ExpiresAt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrUnauthorized
	}
	return nil
}
func (r *IdentityAuthStore) Session(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	s := &domain.Session{}
	err := r.pool.QueryRow(ctx, `SELECT s.id,s.application_id,s.user_id,s.key_version,s.password_fingerprint,s.expires_at
        FROM auth_sessions s JOIN auth_applications a ON a.id=s.application_id
        WHERE s.id=$1 AND s.revoked_at IS NULL AND s.expires_at>NOW() AND a.active AND a.key_version=s.key_version`, id).Scan(&s.ID, &s.ApplicationID, &s.UserID, &s.KeyVersion, &s.PasswordFingerprint, &s.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrUnauthorized
	}
	if err != nil {
		return nil, err
	}
	return s, nil
}
func (r *IdentityAuthStore) RevokeSession(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1 AND revoked_at IS NULL`, id)
	return err
}

// identityDirectory updates only identity-owned fields, preserving concurrent role changes.
type identityDirectory struct{ *userRepository }

func NewIdentityDirectory(pool *pgxpool.Pool) identity.Directory {
	return &identityDirectory{&userRepository{pool: pool}}
}
func (r *identityDirectory) UpdateProfile(ctx context.Context, id uuid.UUID, p domain.ProfileUpdate) error {
	tag, err := r.pool.Exec(ctx, `UPDATE users SET name=$2,email=$3,nip=$4,jabatan=$5,pangkat=$6,updated_at=NOW() WHERE id=$1 AND status='active' AND NOT must_change_password`, id, p.Name, p.Email, p.NIP, p.Jabatan, p.Pangkat)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrUnauthorized
	}
	return nil
}
func (r *identityDirectory) ChangePassword(ctx context.Context, id uuid.UUID, expectedHash, newHash string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE users SET password_hash=$3,must_change_password=FALSE,updated_at=NOW() WHERE id=$1 AND password_hash=$2 AND status='active'`, id, expectedHash, newHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrUnauthorized
	}
	return nil
}

func (r *identityDirectory) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	u, err := r.userRepository.GetByID(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrNotFound
	}
	return u, err
}
func (r *identityDirectory) GetByNIP(ctx context.Context, nip string) (*domain.User, error) {
	u, err := r.userRepository.GetByNIP(ctx, nip)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrNotFound
	}
	return u, err
}
