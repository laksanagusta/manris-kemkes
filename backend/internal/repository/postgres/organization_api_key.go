package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type organizationAPIKeyRepository struct{ pool *pgxpool.Pool }

func NewOrganizationAPIKeyRepository(pool *pgxpool.Pool) repository.OrganizationAPIKeyRepository {
	return &organizationAPIKeyRepository{pool: pool}
}

func (r *organizationAPIKeyRepository) Get(ctx context.Context, orgID uuid.UUID) (*entity.OrganizationAPIKey, error) {
	key := &entity.OrganizationAPIKey{OrganizationID: orgID}
	err := r.pool.QueryRow(ctx, `SELECT id, prefix, created_at, updated_at, last_used_at
        FROM organization_api_keys WHERE organization_id = $1`, orgID).Scan(&key.ID, &key.Prefix, &key.CreatedAt, &key.UpdatedAt, &key.LastUsedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get organization API key: %w", err)
	}
	return key, nil
}

func (r *organizationAPIKeyRepository) Save(ctx context.Context, key *entity.OrganizationAPIKey, actorID uuid.UUID, expectedID *uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin API key update: %w", err)
	}
	defer tx.Rollback(ctx)
	action := "generate"
	if expectedID == nil {
		err = tx.QueryRow(ctx, `INSERT INTO organization_api_keys
            (organization_id, id, key_hash, prefix, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $5) ON CONFLICT (organization_id) DO NOTHING
            RETURNING created_at, updated_at, last_used_at`,
			key.OrganizationID, key.ID, key.Hash, key.Prefix, actorID).Scan(&key.CreatedAt, &key.UpdatedAt, &key.LastUsedAt)
	} else {
		action = "regenerate"
		err = tx.QueryRow(ctx, `UPDATE organization_api_keys SET id=$2, key_hash=$3,
            prefix=$4, updated_by=$5, updated_at=NOW(), last_used_at=NULL
            WHERE organization_id=$1 AND id=$6
            RETURNING created_at, updated_at, last_used_at`,
			key.OrganizationID, key.ID, key.Hash, key.Prefix, actorID, *expectedID).Scan(&key.CreatedAt, &key.UpdatedAt, &key.LastUsedAt)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domainerrors.ErrConflict
	}
	if err != nil {
		return fmt.Errorf("save organization API key: %w", err)
	}
	_, err = tx.Exec(ctx, `INSERT INTO organization_api_key_events (id, organization_id, actor_id, action)
        VALUES ($1, $2, $3, $4)`, uuid.New(), key.OrganizationID, actorID, action)
	if err != nil {
		return fmt.Errorf("audit API key update: %w", err)
	}
	return tx.Commit(ctx)
}

func (r *organizationAPIKeyRepository) AuthenticateAndConsume(ctx context.Context, hash string) (*entity.APIKeyAdmission, error) {
	result := &entity.APIKeyAdmission{}
	// The row lock serializes concurrent requests across all server instances.
	// Rotation changes the hash on this same row and preserves the quota window.
	err := r.pool.QueryRow(ctx, `UPDATE organization_api_keys SET
        request_count = CASE WHEN window_started_at <= statement_timestamp() - interval '1 minute'
            THEN 1 ELSE LEAST(request_count + 1, 61) END,
        window_started_at = CASE WHEN window_started_at <= statement_timestamp() - interval '1 minute'
            THEN statement_timestamp() ELSE window_started_at END,
        last_used_at = CASE WHEN request_count < 60 OR window_started_at <= statement_timestamp() - interval '1 minute'
            THEN statement_timestamp() ELSE last_used_at END
        WHERE key_hash=$1
        RETURNING organization_id, request_count <= 60,
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_started_at + interval '1 minute' - statement_timestamp()))))::int`, hash).
		Scan(&result.OrganizationID, &result.Allowed, &result.RetryAfter)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrUnauthorized
	}
	if err != nil {
		return nil, fmt.Errorf("authenticate organization API key: %w", err)
	}
	return result, nil
}
