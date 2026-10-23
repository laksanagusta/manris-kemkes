package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ShinkaSnapshotMemo preserves the same response across explicit retries of one signed event.
type ShinkaSnapshotMemo struct{ pool *pgxpool.Pool }

func NewShinkaSnapshotMemo(pool *pgxpool.Pool) *ShinkaSnapshotMemo {
	return &ShinkaSnapshotMemo{pool: pool}
}
func (s *ShinkaSnapshotMemo) Get(ctx context.Context, id uuid.UUID) (string, json.RawMessage, error) {
	var hash string
	var body json.RawMessage
	err := s.pool.QueryRow(ctx, `SELECT request_hash,response FROM shinka_snapshot_events WHERE event_id=$1`, id).Scan(&hash, &body)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil, nil
	}
	return hash, body, err
}
func (s *ShinkaSnapshotMemo) Save(ctx context.Context, id uuid.UUID, hash string, body json.RawMessage) (string, json.RawMessage, error) {
	if _, err := s.pool.Exec(ctx, `INSERT INTO shinka_snapshot_events(event_id,request_hash,response) VALUES($1,$2,$3) ON CONFLICT(event_id) DO NOTHING`, id, hash, body); err != nil {
		return "", nil, err
	}
	return s.Get(ctx, id)
}
