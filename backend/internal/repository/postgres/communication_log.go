package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// communicationLogRepository is the PostgreSQL implementation of repository.CommunicationLogRepository
type communicationLogRepository struct {
	pool *pgxpool.Pool
}

// NewCommunicationLogRepository creates a new communication log repository
func NewCommunicationLogRepository(pool *pgxpool.Pool) repository.CommunicationLogRepository {
	return &communicationLogRepository{pool: pool}
}

// Create inserts a new communication log
func (r *communicationLogRepository) Create(ctx context.Context, log *entity.CommunicationLog) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO communication_logs (risk_id, date, method, stakeholder, notes, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 RETURNING id, created_at`,
		log.RiskID, log.Date, log.Method, log.Stakeholder, log.Notes, log.CreatedBy,
	).Scan(&log.ID, &log.CreatedAt)

	if err != nil {
		return fmt.Errorf("create communication log: %w", err)
	}

	return nil
}

// ListByRiskID retrieves all communication logs for a risk
func (r *communicationLogRepository) ListByRiskID(ctx context.Context, riskID uuid.UUID) ([]*entity.CommunicationLog, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT cl.id, cl.risk_id, cl.date, cl.method, cl.stakeholder, cl.notes, cl.created_by, cl.created_at,
		        COALESCE(u.name, '') as created_by_name
		 FROM communication_logs cl
		 LEFT JOIN users u ON cl.created_by = u.id
		 WHERE cl.risk_id = $1
		 ORDER BY cl.date DESC, cl.created_at DESC`, riskID,
	)

	if err != nil {
		return nil, fmt.Errorf("list communication logs by risk id: %w", err)
	}
	defer rows.Close()

	var logs []*entity.CommunicationLog
	for rows.Next() {
		var log entity.CommunicationLog
		if err := rows.Scan(
			&log.ID, &log.RiskID, &log.Date, &log.Method, &log.Stakeholder,
			&log.Notes, &log.CreatedBy, &log.CreatedAt, &log.CreatedByName,
		); err != nil {
			return nil, fmt.Errorf("scan communication log: %w", err)
		}
		logs = append(logs, &log)
	}

	return logs, nil
}

// Delete removes a communication log
func (r *communicationLogRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM communication_logs WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete communication log: %w", err)
	}
	return nil
}

// FindByID retrieves a single communication log by ID
func (r *communicationLogRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.CommunicationLog, error) {
	log := &entity.CommunicationLog{}
	err := r.pool.QueryRow(ctx,
		`SELECT cl.id, cl.risk_id, cl.date, cl.method, cl.stakeholder, cl.notes, cl.created_by, cl.created_at,
		        COALESCE(u.name, '') as created_by_name
		 FROM communication_logs cl
		 LEFT JOIN users u ON cl.created_by = u.id
		 WHERE cl.id = $1`, id,
	).Scan(
		&log.ID, &log.RiskID, &log.Date, &log.Method, &log.Stakeholder,
		&log.Notes, &log.CreatedBy, &log.CreatedAt, &log.CreatedByName,
	)

	if err != nil {
		return nil, fmt.Errorf("find communication log by id: %w", err)
	}

	return log, nil
}
