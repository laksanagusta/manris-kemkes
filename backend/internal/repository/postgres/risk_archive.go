package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
)

// RiskArchiveRepository changes only lifecycle metadata. The general risk
// Update replaces mitigation plans, cascading deletion into task evidence.
type RiskArchiveRepository struct{ pool *pgxpool.Pool }

func NewRiskArchiveRepository(pool *pgxpool.Pool) *RiskArchiveRepository {
	return &RiskArchiveRepository{pool: pool}
}

func (r *RiskArchiveRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	return (&riskRepository{pool: r.pool}).GetByID(ctx, id, orgIDs)
}

func (r *RiskArchiveRepository) UpdateArchiveMetadata(ctx context.Context, risk *entity.Risk, actorID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin risk archive metadata: %w", err)
	}
	defer tx.Rollback(ctx)
	var previousArchivedAt *time.Time
	var previousReason string
	if err := tx.QueryRow(ctx, `SELECT archived_at, archived_reason FROM risks WHERE id = $1 FOR UPDATE`, risk.ID).Scan(&previousArchivedAt, &previousReason); err != nil {
		return fmt.Errorf("load archive metadata: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE risks SET archived_at = $2, archived_reason = $3, updated_at = now() WHERE id = $1`, risk.ID, risk.ArchivedAt, risk.ArchivedReason); err != nil {
		return fmt.Errorf("update archive metadata: %w", err)
	}
	action := "restore"
	if risk.ArchivedAt != nil {
		action = "archive"
	}
	var actor any
	if actorID != uuid.Nil {
		actor = actorID
	}
	if _, err := tx.Exec(ctx, `INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action, source, metadata)
	 VALUES ($1, 'risk', $2, $3, 'web', jsonb_build_object('previousArchivedAt', $4::timestamptz, 'previousArchivedReason', $5::text, 'archivedAt', $6::timestamptz, 'archivedReason', $7::text))`, actor, risk.ID, action, previousArchivedAt, previousReason, risk.ArchivedAt, risk.ArchivedReason); err != nil {
		return fmt.Errorf("record lifecycle history: %w", err)
	}
	return tx.Commit(ctx)
}
