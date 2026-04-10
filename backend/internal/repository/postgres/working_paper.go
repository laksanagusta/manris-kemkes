package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// workingPaperRepository is the PostgreSQL implementation of repository.WorkingPaperRepository
type workingPaperRepository struct {
	pool *pgxpool.Pool
}

// NewWorkingPaperRepository creates a new working paper repository
func NewWorkingPaperRepository(pool *pgxpool.Pool) repository.WorkingPaperRepository {
	return &workingPaperRepository{pool: pool}
}

// Create inserts a new working paper and its signatories in a transaction
func (r *workingPaperRepository) Create(ctx context.Context, wp *entity.WorkingPaper) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("create working paper begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	snapshotsJSON, err := json.Marshal(wp.RiskSnapshots)
	if err != nil {
		return fmt.Errorf("create working paper marshal snapshots: %w", err)
	}

	err = tx.QueryRow(ctx,
		`INSERT INTO working_papers (title, description, org_id, status, assessment_cycle, risk_snapshots,
		        document_hash, current_signatory_sequence, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, created_at, updated_at`,
		wp.Title, wp.Description, wp.OrgID, wp.Status, wp.AssessmentCycle,
		snapshotsJSON, wp.DocumentHash, wp.CurrentSignatorySequence, wp.CreatedBy,
	).Scan(&wp.ID, &wp.CreatedAt, &wp.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create working paper insert: %w", err)
	}

	for i := range wp.Signatories {
		sig := &wp.Signatories[i]
		var createdAt interface{}
		err = tx.QueryRow(ctx,
			`INSERT INTO working_paper_signatories (working_paper_id, user_id, sequence_no, signer_name,
			        signer_nip, signer_title, signer_role_label, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id, created_at`,
			wp.ID, sig.UserID, sig.SequenceNo, sig.SignerName,
			sig.SignerNIP, sig.SignerTitle, sig.SignerRoleLabel, sig.Status,
		).Scan(&sig.ID, &createdAt)
		if err != nil {
			return fmt.Errorf("create working paper signatory: %w", err)
		}
		sig.WorkingPaperID = wp.ID
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("create working paper commit: %w", err)
	}

	return nil
}

// GetByID retrieves a working paper by ID including its signatories
func (r *workingPaperRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.WorkingPaper, error) {
	wp := &entity.WorkingPaper{}
	var snapshotsRaw []byte

	err := r.pool.QueryRow(ctx,
		`SELECT id, title, description, org_id, status, assessment_cycle, risk_snapshots,
		        document_hash, current_signatory_sequence, created_by,
		        created_at, updated_at, completed_at, cancelled_at
		 FROM working_papers
		 WHERE id = $1`, id,
	).Scan(
		&wp.ID, &wp.Title, &wp.Description, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
		&snapshotsRaw, &wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
		&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get working paper by id: %w", err)
	}

	if len(snapshotsRaw) > 0 {
		if err := json.Unmarshal(snapshotsRaw, &wp.RiskSnapshots); err != nil {
			return nil, fmt.Errorf("get working paper unmarshal snapshots: %w", err)
		}
	}

	sigs, err := r.GetSignatoriesByWorkingPaperID(ctx, wp.ID)
	if err != nil {
		return nil, fmt.Errorf("get working paper signatories: %w", err)
	}
	for _, sig := range sigs {
		wp.Signatories = append(wp.Signatories, *sig)
	}

	return wp, nil
}

// List retrieves working papers with optional filters and pagination
func (r *workingPaperRepository) List(ctx context.Context, orgIDs []uuid.UUID, status string, page, limit int) ([]*entity.WorkingPaper, int, error) {
	countQuery := `SELECT COUNT(*) FROM working_papers WHERE 1=1`
	dataQuery := `SELECT id, title, description, org_id, status, assessment_cycle, risk_snapshots,
	                     document_hash, current_signatory_sequence, created_by,
	                     created_at, updated_at, completed_at, cancelled_at
	              FROM working_papers WHERE 1=1`

	args := []interface{}{}
	argIdx := 1

	if len(orgIDs) > 0 {
		filter := fmt.Sprintf(" AND org_id = ANY($%d)", argIdx)
		countQuery += filter
		dataQuery += filter
		args = append(args, orgIDs)
		argIdx++
	}

	if status != "" && status != "all" {
		filter := fmt.Sprintf(" AND status = $%d", argIdx)
		countQuery += filter
		dataQuery += filter
		args = append(args, status)
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list working papers count: %w", err)
	}

	offset := (page - 1) * limit
	dataQuery += " ORDER BY created_at DESC"
	dataQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list working papers query: %w", err)
	}
	defer rows.Close()

	var papers []*entity.WorkingPaper
	for rows.Next() {
		wp := &entity.WorkingPaper{}
		var snapshotsRaw []byte

		if err := rows.Scan(
			&wp.ID, &wp.Title, &wp.Description, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
			&snapshotsRaw, &wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
			&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt,
		); err != nil {
			return nil, 0, fmt.Errorf("list working papers scan: %w", err)
		}

		if len(snapshotsRaw) > 0 {
			if err := json.Unmarshal(snapshotsRaw, &wp.RiskSnapshots); err != nil {
				return nil, 0, fmt.Errorf("list working papers unmarshal snapshots: %w", err)
			}
		}

		sigs, err := r.GetSignatoriesByWorkingPaperID(ctx, wp.ID)
		if err != nil {
			return nil, 0, fmt.Errorf("list working papers get signatories: %w", err)
		}
		for _, sig := range sigs {
			wp.Signatories = append(wp.Signatories, *sig)
		}

		papers = append(papers, wp)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list working papers rows: %w", err)
	}

	return papers, total, nil
}

// Update updates a working paper's mutable fields
func (r *workingPaperRepository) Update(ctx context.Context, wp *entity.WorkingPaper) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE working_papers
		 SET status = $2, current_signatory_sequence = $3, completed_at = $4,
		     cancelled_at = $5, updated_at = NOW()
		 WHERE id = $1`,
		wp.ID, wp.Status, wp.CurrentSignatorySequence, wp.CompletedAt, wp.CancelledAt,
	)
	if err != nil {
		return fmt.Errorf("update working paper: %w", err)
	}
	return nil
}

// Delete deletes a working paper by ID (cascade handles signatories)
func (r *workingPaperRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM working_papers WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete working paper: %w", err)
	}
	return nil
}

// GetByIDForUpdate retrieves a working paper with a FOR UPDATE lock for signing concurrency.
// Should be called within a transaction context managed by the caller.
func (r *workingPaperRepository) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*entity.WorkingPaper, error) {
	wp := &entity.WorkingPaper{}
	var snapshotsRaw []byte

	err := r.pool.QueryRow(ctx,
		`SELECT id, title, description, org_id, status, assessment_cycle, risk_snapshots,
		        document_hash, current_signatory_sequence, created_by,
		        created_at, updated_at, completed_at, cancelled_at
		 FROM working_papers
		 WHERE id = $1
		 FOR UPDATE`, id,
	).Scan(
		&wp.ID, &wp.Title, &wp.Description, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
		&snapshotsRaw, &wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
		&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get working paper for update: %w", err)
	}

	if len(snapshotsRaw) > 0 {
		if err := json.Unmarshal(snapshotsRaw, &wp.RiskSnapshots); err != nil {
			return nil, fmt.Errorf("get working paper for update unmarshal snapshots: %w", err)
		}
	}

	sigs, err := r.GetSignatoriesByWorkingPaperID(ctx, wp.ID)
	if err != nil {
		return nil, fmt.Errorf("get working paper for update signatories: %w", err)
	}
	for _, sig := range sigs {
		wp.Signatories = append(wp.Signatories, *sig)
	}

	return wp, nil
}

// GetSignatoriesByWorkingPaperID retrieves all signatories for a working paper
func (r *workingPaperRepository) GetSignatoriesByWorkingPaperID(ctx context.Context, wpID uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, working_paper_id, user_id, sequence_no, signer_name, signer_nip,
		        signer_title, signer_role_label, status, signed_at, qr_code_png, qr_data
		 FROM working_paper_signatories
		 WHERE working_paper_id = $1
		 ORDER BY sequence_no`, wpID,
	)
	if err != nil {
		return nil, fmt.Errorf("get signatories by working paper id: %w", err)
	}
	defer rows.Close()

	var sigs []*entity.WorkingPaperSignatory
	for rows.Next() {
		sig := &entity.WorkingPaperSignatory{}
		var qrCodePNG *string
		var qrData []byte

		if err := rows.Scan(
			&sig.ID, &sig.WorkingPaperID, &sig.UserID, &sig.SequenceNo,
			&sig.SignerName, &sig.SignerNIP, &sig.SignerTitle, &sig.SignerRoleLabel,
			&sig.Status, &sig.SignedAt, &qrCodePNG, &qrData,
		); err != nil {
			return nil, fmt.Errorf("scan signatory: %w", err)
		}

		if qrCodePNG != nil {
			sig.QRCodePNG = *qrCodePNG
		}
		if len(qrData) > 0 {
			sig.QRData = json.RawMessage(qrData)
		}

		sigs = append(sigs, sig)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate signatories: %w", err)
	}

	return sigs, nil
}

// UpdateSignatory updates a signatory's status and signing data
func (r *workingPaperRepository) UpdateSignatory(ctx context.Context, sig *entity.WorkingPaperSignatory) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE working_paper_signatories
		 SET status = $2, signed_at = $3, qr_code_png = $4, qr_data = $5
		 WHERE id = $1`,
		sig.ID, sig.Status, sig.SignedAt, sig.QRCodePNG, sig.QRData,
	)
	if err != nil {
		return fmt.Errorf("update signatory: %w", err)
	}
	return nil
}

// GetPendingSigningByUserID retrieves working papers pending the given user's signature
func (r *workingPaperRepository) GetPendingSigningByUserID(ctx context.Context, userID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.WorkingPaper, error) {
	query := `SELECT wp.id, wp.title, wp.description, wp.org_id, wp.status, wp.assessment_cycle,
		        wp.risk_snapshots, wp.document_hash, wp.current_signatory_sequence, wp.created_by,
		        wp.created_at, wp.updated_at, wp.completed_at, wp.cancelled_at
		 FROM working_papers wp
		 INNER JOIN working_paper_signatories wps ON wps.working_paper_id = wp.id
		 WHERE wp.status IN ('draft', 'signing')
		   AND wps.user_id = $1
		   AND wps.sequence_no = wp.current_signatory_sequence + 1
		   AND wps.status = 'pending'`

	args := []interface{}{userID}
	argIdx := 2

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND wp.org_id = ANY($%d)", argIdx)
		args = append(args, orgIDs)
		argIdx++
	}

	query += " ORDER BY wp.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("get pending signing by user id: %w", err)
	}
	defer rows.Close()

	var papers []*entity.WorkingPaper
	for rows.Next() {
		wp := &entity.WorkingPaper{}
		var snapshotsRaw []byte

		if err := rows.Scan(
			&wp.ID, &wp.Title, &wp.Description, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
			&snapshotsRaw, &wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
			&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt,
		); err != nil {
			return nil, fmt.Errorf("scan pending signing working paper: %w", err)
		}

		if len(snapshotsRaw) > 0 {
			if err := json.Unmarshal(snapshotsRaw, &wp.RiskSnapshots); err != nil {
				return nil, fmt.Errorf("pending signing unmarshal snapshots: %w", err)
			}
		}

		sigs, err := r.GetSignatoriesByWorkingPaperID(ctx, wp.ID)
		if err != nil {
			return nil, fmt.Errorf("pending signing get signatories: %w", err)
		}
		for _, sig := range sigs {
			wp.Signatories = append(wp.Signatories, *sig)
		}

		papers = append(papers, wp)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pending signing: %w", err)
	}

	return papers, nil
}

// CountPendingSigningByUserID returns the count of working papers pending the given user's signature
func (r *workingPaperRepository) CountPendingSigningByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*)
		 FROM working_papers wp
		 INNER JOIN working_paper_signatories wps ON wps.working_paper_id = wp.id
		 WHERE wp.status IN ('draft', 'signing')
		   AND wps.user_id = $1
		   AND wps.sequence_no = wp.current_signatory_sequence + 1
		   AND wps.status = 'pending'`, userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count pending signing by user id: %w", err)
	}
	return count, nil
}
