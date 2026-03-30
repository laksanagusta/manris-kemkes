package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// approvalRepository is the PostgreSQL implementation of repository.ApprovalRepository
type approvalRepository struct {
	pool *pgxpool.Pool
}

// NewApprovalRepository creates a new approval repository
func NewApprovalRepository(pool *pgxpool.Pool) repository.ApprovalRepository {
	return &approvalRepository{pool: pool}
}

// List retrieves approval requests with optional filters
func (r *approvalRepository) List(ctx context.Context, status string, approverRole string) ([]*entity.ApprovalRequest, error) {
	query := `
		SELECT ar.id, ar.request_type, ar.entity_id, ar.requested_by, ar.requested_at,
		       ar.current_status, ar.current_approver_role, ar.notes,
		       ar.created_at, ar.updated_at,
		       COALESCE(u.name, '') as requested_by_name,
		       CASE
			       WHEN ar.request_type = 'risk' THEN (SELECT code FROM risks WHERE id = ar.entity_id)
			       WHEN ar.request_type = 'incident' THEN (SELECT code FROM incidents WHERE id = ar.entity_id)
			       ELSE NULL
		       END as entity_code,
		       CASE
			       WHEN ar.request_type = 'risk' THEN (SELECT title FROM risks WHERE id = ar.entity_id)
			       WHEN ar.request_type = 'incident' THEN (SELECT title FROM incidents WHERE id = ar.entity_id)
			       ELSE NULL
		       END as entity_title
		FROM approval_requests ar
		LEFT JOIN users u ON ar.requested_by = u.id
		WHERE 1=1`

	args := []interface{}{}
	argIdx := 1

	if status != "" && status != "all" {
		query += fmt.Sprintf(" AND ar.current_status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if approverRole != "" {
		query += fmt.Sprintf(" AND ar.current_approver_role = $%d", argIdx)
		args = append(args, approverRole)
		argIdx++
	}

	query += " ORDER BY ar.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list approval requests: %w", err)
	}
	defer rows.Close()

	var requests []*entity.ApprovalRequest
	for rows.Next() {
		var req entity.ApprovalRequest
		if err := rows.Scan(
			&req.ID, &req.RequestType, &req.EntityID, &req.RequestedBy, &req.RequestedAt,
			&req.CurrentStatus, &req.CurrentApproverRole, &req.Notes,
			&req.CreatedAt, &req.UpdatedAt,
			&req.RequestedByName, &req.EntityCode, &req.EntityTitle,
		); err != nil {
			return nil, fmt.Errorf("scan approval request: %w", err)
		}
		requests = append(requests, &req)
	}

	return requests, nil
}

// FindByID retrieves a single approval request by ID
func (r *approvalRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.ApprovalRequest, error) {
	req := &entity.ApprovalRequest{}
	err := r.pool.QueryRow(ctx,
		`SELECT ar.id, ar.request_type, ar.entity_id, ar.requested_by, ar.requested_at,
		       ar.current_status, ar.current_approver_role, ar.notes,
		       ar.created_at, ar.updated_at,
		       COALESCE(u.name, '') as requested_by_name,
		       CASE
			       WHEN ar.request_type = 'risk' THEN (SELECT code FROM risks WHERE id = ar.entity_id)
			       WHEN ar.request_type = 'incident' THEN (SELECT code FROM incidents WHERE id = ar.entity_id)
			       ELSE NULL
		       END as entity_code,
		       CASE
			       WHEN ar.request_type = 'risk' THEN (SELECT title FROM risks WHERE id = ar.entity_id)
			       WHEN ar.request_type = 'incident' THEN (SELECT title FROM incidents WHERE id = ar.entity_id)
			       ELSE NULL
		       END as entity_title
		FROM approval_requests ar
		LEFT JOIN users u ON ar.requested_by = u.id
		WHERE ar.id = $1`, id,
	).Scan(
		&req.ID, &req.RequestType, &req.EntityID, &req.RequestedBy, &req.RequestedAt,
		&req.CurrentStatus, &req.CurrentApproverRole, &req.Notes,
		&req.CreatedAt, &req.UpdatedAt,
		&req.RequestedByName, &req.EntityCode, &req.EntityTitle,
	)

	if err != nil {
		return nil, fmt.Errorf("find approval request by id: %w", err)
	}

	return req, nil
}

// FindByEntity retrieves an approval request by entity type and ID
func (r *approvalRepository) FindByEntity(ctx context.Context, requestType string, entityID uuid.UUID) (*entity.ApprovalRequest, error) {
	req := &entity.ApprovalRequest{}
	err := r.pool.QueryRow(ctx,
		`SELECT ar.id, ar.request_type, ar.entity_id, ar.requested_by, ar.requested_at,
		       ar.current_status, ar.current_approver_role, ar.notes,
		       ar.created_at, ar.updated_at,
		       COALESCE(u.name, '') as requested_by_name,
		       CASE
			       WHEN ar.request_type = 'risk' THEN (SELECT code FROM risks WHERE id = ar.entity_id)
			       WHEN ar.request_type = 'incident' THEN (SELECT code FROM incidents WHERE id = ar.entity_id)
			       ELSE NULL
		       END as entity_code,
		       CASE
			       WHEN ar.request_type = 'risk' THEN (SELECT title FROM risks WHERE id = ar.entity_id)
			       WHEN ar.request_type = 'incident' THEN (SELECT title FROM incidents WHERE id = ar.entity_id)
			       ELSE NULL
		       END as entity_title
		FROM approval_requests ar
		LEFT JOIN users u ON ar.requested_by = u.id
		WHERE ar.request_type = $1 AND ar.entity_id = $2`, requestType, entityID,
	).Scan(
		&req.ID, &req.RequestType, &req.EntityID, &req.RequestedBy, &req.RequestedAt,
		&req.CurrentStatus, &req.CurrentApproverRole, &req.Notes,
		&req.CreatedAt, &req.UpdatedAt,
		&req.RequestedByName, &req.EntityCode, &req.EntityTitle,
	)

	if err != nil {
		return nil, fmt.Errorf("find approval request by entity: %w", err)
	}

	return req, nil
}

// Create inserts a new approval request
func (r *approvalRepository) Create(ctx context.Context, req *entity.ApprovalRequest) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO approval_requests (request_type, entity_id, requested_by, current_status, current_approver_role, notes)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 RETURNING id, created_at, updated_at`,
		req.RequestType, req.EntityID, req.RequestedBy, "pending", "unit", req.Notes,
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)

	if err != nil {
		return fmt.Errorf("create approval request: %w", err)
	}

	return nil
}

// UpdateStatus updates the status of an approval request
func (r *approvalRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE approval_requests SET current_status=$1, updated_at=NOW() WHERE id=$2`,
		status, id,
	)

	if err != nil {
		return fmt.Errorf("update approval status: %w", err)
	}

	return nil
}

// AddHistory adds a history entry to an approval request
func (r *approvalRepository) AddHistory(ctx context.Context, hist *entity.ApprovalHistory) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO approval_histories (approval_request_id, action, actor_id, actor_name, actor_role, comments)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 RETURNING id, created_at`,
		hist.ApprovalRequestID, hist.Action, hist.ActorID, hist.ActorName, hist.ActorRole, hist.Comments,
	).Scan(&hist.ID, &hist.CreatedAt)

	if err != nil {
		return fmt.Errorf("add approval history: %w", err)
	}

	return nil
}

// GetHistory retrieves all history entries for an approval request
func (r *approvalRepository) GetHistory(ctx context.Context, approvalRequestID uuid.UUID) ([]*entity.ApprovalHistory, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, approval_request_id, action, actor_id, actor_name, actor_role, comments, created_at
		 FROM approval_histories
		 WHERE approval_request_id = $1
		 ORDER BY created_at ASC`, approvalRequestID,
	)

	if err != nil {
		return nil, fmt.Errorf("get approval history: %w", err)
	}
	defer rows.Close()

	var histories []*entity.ApprovalHistory
	for rows.Next() {
		var hist entity.ApprovalHistory
		if err := rows.Scan(
			&hist.ID, &hist.ApprovalRequestID, &hist.Action, &hist.ActorID,
			&hist.ActorName, &hist.ActorRole, &hist.Comments, &hist.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan approval history: %w", err)
		}
		histories = append(histories, &hist)
	}

	return histories, nil
}

// GetPendingCount returns the count of pending approval requests for a role
func (r *approvalRepository) GetPendingCount(ctx context.Context, approverRole string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM approval_requests WHERE current_status='pending' AND current_approver_role=$1`,
		approverRole,
	).Scan(&count)

	if err != nil {
		return 0, fmt.Errorf("get pending count: %w", err)
	}

	return count, nil
}
