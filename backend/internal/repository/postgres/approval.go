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
func (r *approvalRepository) List(ctx context.Context, status string, approverRole string, approverUserID *uuid.UUID) ([]*entity.ApprovalRequest, error) {
	query := `
		SELECT ar.id, ar.request_type, ar.entity_id, ar.requested_by, ar.requested_at,
		       ar.current_status, ar.current_approver_role, ar.current_approver_user_id, ar.notes,
		       ar.created_at, ar.updated_at,
		       COALESCE(u.name, '') as requested_by_name,
		       COALESCE(cu.name, '') as current_approver_name,
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
		LEFT JOIN users cu ON ar.current_approver_user_id = cu.id
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
	if approverUserID != nil {
		query += fmt.Sprintf(" AND ar.current_approver_user_id = $%d", argIdx)
		args = append(args, *approverUserID)
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
			&req.CurrentStatus, &req.CurrentApproverRole, &req.CurrentApproverUserID, &req.Notes,
			&req.CreatedAt, &req.UpdatedAt,
			&req.RequestedByName, &req.CurrentApproverName, &req.EntityCode, &req.EntityTitle,
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
		       ar.current_status, ar.current_approver_role, ar.current_approver_user_id, ar.notes,
		       ar.created_at, ar.updated_at,
		       COALESCE(u.name, '') as requested_by_name,
		       COALESCE(cu.name, '') as current_approver_name,
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
		LEFT JOIN users cu ON ar.current_approver_user_id = cu.id
		WHERE ar.id = $1`, id,
	).Scan(
		&req.ID, &req.RequestType, &req.EntityID, &req.RequestedBy, &req.RequestedAt,
		&req.CurrentStatus, &req.CurrentApproverRole, &req.CurrentApproverUserID, &req.Notes,
		&req.CreatedAt, &req.UpdatedAt,
		&req.RequestedByName, &req.CurrentApproverName, &req.EntityCode, &req.EntityTitle,
	)

	if err != nil {
		return nil, fmt.Errorf("find approval request by id: %w", err)
	}

	history, _ := r.GetHistory(ctx, req.ID)
	for _, item := range history {
		req.History = append(req.History, *item)
	}
	steps, _ := r.GetSteps(ctx, req.ID)
	for _, item := range steps {
		req.Steps = append(req.Steps, *item)
	}
	return req, nil
}

// FindByEntity retrieves an approval request by entity type and ID
func (r *approvalRepository) FindByEntity(ctx context.Context, requestType string, entityID uuid.UUID) (*entity.ApprovalRequest, error) {
	req := &entity.ApprovalRequest{}
	err := r.pool.QueryRow(ctx,
		`SELECT ar.id, ar.request_type, ar.entity_id, ar.requested_by, ar.requested_at,
		       ar.current_status, ar.current_approver_role, ar.current_approver_user_id, ar.notes,
		       ar.created_at, ar.updated_at,
		       COALESCE(u.name, '') as requested_by_name,
		       COALESCE(cu.name, '') as current_approver_name,
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
		LEFT JOIN users cu ON ar.current_approver_user_id = cu.id
		WHERE ar.request_type = $1 AND ar.entity_id = $2
		ORDER BY ar.requested_at DESC, ar.created_at DESC
		LIMIT 1`, requestType, entityID,
	).Scan(
		&req.ID, &req.RequestType, &req.EntityID, &req.RequestedBy, &req.RequestedAt,
		&req.CurrentStatus, &req.CurrentApproverRole, &req.CurrentApproverUserID, &req.Notes,
		&req.CreatedAt, &req.UpdatedAt,
		&req.RequestedByName, &req.CurrentApproverName, &req.EntityCode, &req.EntityTitle,
	)

	if err != nil {
		return nil, fmt.Errorf("find approval request by entity: %w", err)
	}

	history, _ := r.GetHistory(ctx, req.ID)
	for _, item := range history {
		req.History = append(req.History, *item)
	}
	steps, _ := r.GetSteps(ctx, req.ID)
	for _, item := range steps {
		req.Steps = append(req.Steps, *item)
	}

	return req, nil
}

func (r *approvalRepository) GetHistoryByEntity(ctx context.Context, requestType string, entityID uuid.UUID) ([]*entity.ApprovalHistory, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT ah.id, ah.approval_request_id, ah.action, ah.actor_id, ah.actor_name, ah.actor_role, ah.comments, ah.created_at
		 FROM approval_histories ah
		 JOIN approval_requests ar ON ar.id = ah.approval_request_id
		 WHERE ar.request_type = $1 AND ar.entity_id = $2
		 ORDER BY ah.created_at ASC`, requestType, entityID,
	)
	if err != nil {
		return nil, fmt.Errorf("get approval history by entity: %w", err)
	}
	defer rows.Close()

	histories := make([]*entity.ApprovalHistory, 0)
	for rows.Next() {
		var hist entity.ApprovalHistory
		if err := rows.Scan(
			&hist.ID, &hist.ApprovalRequestID, &hist.Action, &hist.ActorID,
			&hist.ActorName, &hist.ActorRole, &hist.Comments, &hist.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan approval history by entity: %w", err)
		}
		histories = append(histories, &hist)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate approval history by entity: %w", err)
	}

	return histories, nil
}

// Create inserts a new approval request
func (r *approvalRepository) Create(ctx context.Context, req *entity.ApprovalRequest) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO approval_requests (request_type, entity_id, requested_by, current_status, current_approver_role, current_approver_user_id, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 RETURNING id, created_at, updated_at`,
		req.RequestType, req.EntityID, req.RequestedBy, req.CurrentStatus, req.CurrentApproverRole, req.CurrentApproverUserID, req.Notes,
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)

	if err != nil {
		return fmt.Errorf("create approval request: %w", err)
	}

	return nil
}

func (r *approvalRepository) CreateSteps(ctx context.Context, approvalRequestID uuid.UUID, steps []entity.ApprovalStep) error {
	for _, step := range steps {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO approval_steps (approval_request_id, sequence_no, approver_user_id, status, comments)
			 VALUES ($1,$2,$3,$4,$5)`,
			approvalRequestID, step.SequenceNo, step.ApproverUserID, step.Status, step.Comments,
		)
		if err != nil {
			return fmt.Errorf("create approval step: %w", err)
		}
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

func (r *approvalRepository) GetSteps(ctx context.Context, approvalRequestID uuid.UUID) ([]*entity.ApprovalStep, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT s.id, s.approval_request_id, s.sequence_no, s.approver_user_id,
		        COALESCE(u.name, '') as approver_name, COALESCE(u.role, '') as approver_role,
		        s.status, s.acted_at, COALESCE(s.comments, ''), s.created_at, s.updated_at
		 FROM approval_steps s
		 LEFT JOIN users u ON s.approver_user_id = u.id
		 WHERE s.approval_request_id = $1
		 ORDER BY s.sequence_no ASC`, approvalRequestID)
	if err != nil {
		return nil, fmt.Errorf("get approval steps: %w", err)
	}
	defer rows.Close()

	var steps []*entity.ApprovalStep
	for rows.Next() {
		var step entity.ApprovalStep
		if err := rows.Scan(&step.ID, &step.ApprovalRequestID, &step.SequenceNo, &step.ApproverUserID, &step.ApproverName, &step.ApproverRole, &step.Status, &step.ActedAt, &step.Comments, &step.CreatedAt, &step.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan approval step: %w", err)
		}
		steps = append(steps, &step)
	}
	return steps, nil
}

func (r *approvalRepository) ApproveCurrentStep(ctx context.Context, approvalRequestID uuid.UUID, actorID uuid.UUID, comments string) (*entity.ApprovalStep, *entity.ApprovalStep, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("begin approve current step: %w", err)
	}
	defer tx.Rollback(ctx)

	current := &entity.ApprovalStep{}
	err = tx.QueryRow(ctx,
		`SELECT s.id, s.approval_request_id, s.sequence_no, s.approver_user_id, COALESCE(u.name, ''), COALESCE(u.role, ''), s.status, s.acted_at, COALESCE(s.comments, ''), s.created_at, s.updated_at
		 FROM approval_steps s
		 LEFT JOIN users u ON s.approver_user_id = u.id
		 WHERE s.approval_request_id = $1 AND s.status = 'pending'
		 ORDER BY s.sequence_no ASC LIMIT 1`, approvalRequestID,
	).Scan(&current.ID, &current.ApprovalRequestID, &current.SequenceNo, &current.ApproverUserID, &current.ApproverName, &current.ApproverRole, &current.Status, &current.ActedAt, &current.Comments, &current.CreatedAt, &current.UpdatedAt)
	if err != nil {
		return nil, nil, fmt.Errorf("find current approval step: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE approval_steps SET status = 'approved', acted_at = NOW(), comments = $2, updated_at = NOW() WHERE id = $1`, current.ID, comments); err != nil {
		return nil, nil, fmt.Errorf("approve current step: %w", err)
	}
	current.Status = "approved"
	current.Comments = comments

	next := &entity.ApprovalStep{}
	err = tx.QueryRow(ctx,
		`SELECT s.id, s.approval_request_id, s.sequence_no, s.approver_user_id, COALESCE(u.name, ''), COALESCE(u.role, ''), s.status, s.acted_at, COALESCE(s.comments, ''), s.created_at, s.updated_at
		 FROM approval_steps s
		 LEFT JOIN users u ON s.approver_user_id = u.id
		 WHERE s.approval_request_id = $1 AND s.sequence_no > $2 AND s.status = 'pending'
		 ORDER BY s.sequence_no ASC LIMIT 1`, approvalRequestID, current.SequenceNo,
	).Scan(&next.ID, &next.ApprovalRequestID, &next.SequenceNo, &next.ApproverUserID, &next.ApproverName, &next.ApproverRole, &next.Status, &next.ActedAt, &next.Comments, &next.CreatedAt, &next.UpdatedAt)
	if err != nil {
		next = nil
	}
	if next != nil {
		if _, err := tx.Exec(ctx, `UPDATE approval_requests SET current_approver_user_id = $2, current_approver_role = $3, updated_at = NOW() WHERE id = $1`, approvalRequestID, next.ApproverUserID, next.ApproverRole); err != nil {
			return nil, nil, fmt.Errorf("update next approver: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit approve current step: %w", err)
	}
	return current, next, nil
}

func (r *approvalRepository) RejectCurrentStep(ctx context.Context, approvalRequestID uuid.UUID, actorID uuid.UUID, comments string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE approval_steps
		 SET status = 'rejected', acted_at = NOW(), comments = $2, updated_at = NOW()
		 WHERE id = (
		   SELECT id FROM approval_steps
		   WHERE approval_request_id = $1 AND status = 'pending'
		   ORDER BY sequence_no ASC
		   LIMIT 1
		 )`, approvalRequestID, comments)
	if err != nil {
		return fmt.Errorf("reject current step: %w", err)
	}
	return nil
}

// GetPendingCount returns the count of pending approval requests for a role/user.
func (r *approvalRepository) GetPendingCount(ctx context.Context, approverRole string, approverUserID *uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM approval_requests WHERE current_status='pending'`
	args := make([]interface{}, 0)
	if approverRole != "" {
		query += fmt.Sprintf(" AND current_approver_role=$%d", len(args)+1)
		args = append(args, approverRole)
	}
	if approverUserID != nil {
		query += fmt.Sprintf(" AND current_approver_user_id=$%d", len(args)+1)
		args = append(args, *approverUserID)
	}
	err := r.pool.QueryRow(ctx, query, args...).Scan(&count)

	if err != nil {
		return 0, fmt.Errorf("get pending count: %w", err)
	}

	return count, nil
}
