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
)

type RiskEventNoteRepository struct{ pool *pgxpool.Pool }

func NewRiskEventNoteRepository(pool *pgxpool.Pool) *RiskEventNoteRepository {
	return &RiskEventNoteRepository{pool: pool}
}
func (r *RiskEventNoteRepository) Add(ctx context.Context, n *entity.RiskEventNote, requestID uuid.UUID) (*entity.RiskEventNote, error) {
	result := &entity.RiskEventNote{}
	err := r.pool.QueryRow(ctx, `INSERT INTO risk_event_notes(event_id,body,created_by,request_id) VALUES($1,$2,$3,$4)
 ON CONFLICT(event_id,request_id) DO UPDATE SET body=risk_event_notes.body
 WHERE risk_event_notes.body=EXCLUDED.body AND risk_event_notes.created_by=EXCLUDED.created_by
 RETURNING id,event_id,body,created_by,COALESCE((SELECT name FROM users WHERE id=risk_event_notes.created_by),''),created_at`, n.EventID, n.Body, n.CreatedBy, requestID).Scan(&result.ID, &result.EventID, &result.Body, &result.CreatedBy, &result.CreatedByName, &result.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrConflict
	}
	if err != nil {
		return nil, fmt.Errorf("add event note: %w", err)
	}
	return result, nil
}
func (r *RiskEventNoteRepository) List(ctx context.Context, id uuid.UUID) ([]entity.RiskEventNote, error) {
	rows, err := r.pool.Query(ctx, `SELECT n.id,n.event_id,n.body,n.created_by,COALESCE(u.name,''),n.created_at FROM risk_event_notes n LEFT JOIN users u ON u.id=n.created_by WHERE n.event_id=$1 ORDER BY n.created_at,n.id`, id)
	if err != nil {
		return nil, fmt.Errorf("list event notes: %w", err)
	}
	defer rows.Close()
	items := make([]entity.RiskEventNote, 0)
	for rows.Next() {
		var n entity.RiskEventNote
		if err := rows.Scan(&n.ID, &n.EventID, &n.Body, &n.CreatedBy, &n.CreatedByName, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan event note: %w", err)
		}
		items = append(items, n)
	}
	return items, rows.Err()
}
