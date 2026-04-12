package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// workingPaperRepository is the PostgreSQL implementation of repository.WorkingPaperRepository
type workingPaperRepository struct {
	pool *pgxpool.Pool
}

type workingPaperReader interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
}

type workingPaperExecer interface {
	Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
}

type workingPaperTx interface {
	workingPaperExecer
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// NewWorkingPaperRepository creates a new working paper repository
func NewWorkingPaperRepository(pool *pgxpool.Pool) repository.WorkingPaperRepository {
	return &workingPaperRepository{pool: pool}
}

func finalizedWorkingPaperRiskExpr(alias, reviewedField, baseField string) string {
	return fmt.Sprintf(`CASE
		WHEN %[1]s.status = 'approved'
			AND %[1]s.reviewed_probability IS NOT NULL
			AND %[1]s.reviewed_impact IS NOT NULL
			AND %[1]s.reviewed_weight IS NOT NULL
			AND %[1]s.reviewed_nilai IS NOT NULL
			AND %[1]s.reviewed_score IS NOT NULL
		THEN %[1]s.%[2]s
		ELSE %[1]s.%[3]s
	END`, alias, reviewedField, baseField)
}

func (r *workingPaperRepository) getWorkingPaperRisks(ctx context.Context, q workingPaperReader, wpID uuid.UUID) ([]entity.WorkingPaperRiskLink, error) {
	probabilityExpr := finalizedWorkingPaperRiskExpr("risk", "reviewed_probability", "probability")
	impactExpr := finalizedWorkingPaperRiskExpr("risk", "reviewed_impact", "impact")
	weightExpr := finalizedWorkingPaperRiskExpr("risk", "reviewed_weight", "weight")
	nilaiExpr := finalizedWorkingPaperRiskExpr("risk", "reviewed_nilai", "nilai")

	query := fmt.Sprintf(`SELECT wpr.id, wpr.working_paper_id, wpr.risk_id, wpr.sort_order, wpr.source_mode, wpr.created_at,
		       risk.id, risk.code, risk.title, risk.description, risk.category, risk.status,
		       COALESCE(org.name, ''),
		       %s AS probability,
		       %s AS impact,
		       %s AS bobot,
		       %s AS nilai,
		       COALESCE(risk.cause, ARRAY[]::text[]),
		       COALESCE(risk.risk_source, ''),
		       COALESCE(risk.controllability, ''),
		       COALESCE(risk.impact_description, ARRAY[]::text[]),
		       COALESCE(risk.existing_control, ''),
		       COALESCE(risk.control_effectiveness, ''),
		       COALESCE(risk.risk_appetite, ''),
		       COALESCE(risk.treatment_option, ''),
		       COALESCE((SELECT array_agg(m.action ORDER BY m.sort_order) FROM mitigations m WHERE m.risk_id = risk.id), ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(m.due_date ORDER BY m.sort_order) FROM mitigations m WHERE m.risk_id = risk.id AND m.due_date IS NOT NULL), ARRAY[]::text[]),
		       risk.target_probability,
		       risk.target_impact,
		       risk.target_weight,
		       risk.target_nilai,
		       COALESCE(risk.assessment_cycle, '')
		FROM working_paper_risks wpr
		INNER JOIN risks risk ON risk.id = wpr.risk_id
		LEFT JOIN organizations org ON org.id = risk.organization_id
		WHERE wpr.working_paper_id = $1
		ORDER BY wpr.sort_order, wpr.created_at, wpr.id`, probabilityExpr, impactExpr, weightExpr, nilaiExpr)

	rows, err := q.Query(ctx, query, wpID)
	if err != nil {
		return nil, fmt.Errorf("get working paper risks: %w", err)
	}
	defer rows.Close()

	links := make([]entity.WorkingPaperRiskLink, 0)
	for rows.Next() {
		var link entity.WorkingPaperRiskLink
		if err := rows.Scan(
			&link.ID,
			&link.WorkingPaperID,
			&link.RiskID,
			&link.SortOrder,
			&link.SourceMode,
			&link.CreatedAt,
			&link.Risk.ID,
			&link.Risk.Code,
			&link.Risk.Title,
			&link.Risk.Description,
			&link.Risk.Category,
			&link.Risk.Status,
			&link.Risk.OrgName,
			&link.Risk.Probability,
			&link.Risk.Impact,
			&link.Risk.Bobot,
			&link.Risk.Nilai,
			&link.Risk.Cause,
			&link.Risk.RiskSource,
			&link.Risk.Controllability,
			&link.Risk.ImpactDesc,
			&link.Risk.ExistingControl,
			&link.Risk.ControlEffectiveness,
			&link.Risk.RiskAppetite,
			&link.Risk.TreatmentOption,
			&link.Risk.Mitigations,
			&link.Risk.MitigationDueDates,
			&link.Risk.TargetProbability,
			&link.Risk.TargetImpact,
			&link.Risk.TargetBobot,
			&link.Risk.TargetNilai,
			&link.Risk.AssessmentCycle,
		); err != nil {
			return nil, fmt.Errorf("scan working paper risk: %w", err)
		}

		link.Risk.NormalizeDerivedScores()
		links = append(links, link)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate working paper risks: %w", err)
	}

	return links, nil
}

func (r *workingPaperRepository) getSignatoriesByWorkingPaperID(ctx context.Context, q workingPaperReader, wpID uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	rows, err := q.Query(ctx,
		`SELECT id, working_paper_id, user_id, sequence_no, signer_name, signer_nip,
		        signer_jabatan, signer_pangkat, status, signed_at, qr_code_png, qr_data
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
			&sig.SignerName, &sig.SignerNIP, &sig.SignerJabatan, &sig.SignerPangkat,
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

func (r *workingPaperRepository) loadWorkingPaper(ctx context.Context, q workingPaperReader, id uuid.UUID, forUpdate bool) (*entity.WorkingPaper, error) {
	query := `SELECT id, title, description, org_id, status, assessment_cycle, document_hash, current_signatory_sequence, created_by,
	        created_at, updated_at, completed_at, cancelled_at
	 FROM working_papers
	 WHERE id = $1`
	if forUpdate {
		query += ` FOR UPDATE`
	}

	wp := &entity.WorkingPaper{}
	err := q.QueryRow(ctx, query, id).Scan(
		&wp.ID, &wp.Title, &wp.Description, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
		&wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
		&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get working paper by id: %w", err)
	}

	risks, err := r.getWorkingPaperRisks(ctx, q, wp.ID)
	if err != nil {
		return nil, fmt.Errorf("get working paper risks: %w", err)
	}
	wp.Risks = risks

	sigs, err := r.getSignatoriesByWorkingPaperID(ctx, q, wp.ID)
	if err != nil {
		return nil, fmt.Errorf("get working paper signatories: %w", err)
	}
	for _, sig := range sigs {
		wp.Signatories = append(wp.Signatories, *sig)
	}

	return wp, nil
}

func (r *workingPaperRepository) updateWorkingPaper(ctx context.Context, execer workingPaperExecer, wp *entity.WorkingPaper) error {
	_, err := execer.Exec(ctx,
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

func (r *workingPaperRepository) updateSignatory(ctx context.Context, execer workingPaperExecer, sig *entity.WorkingPaperSignatory) error {
	_, err := execer.Exec(ctx,
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

func insertWorkingPaperRiskLinks(ctx context.Context, execer workingPaperExecer, wp *entity.WorkingPaper) error {
	for i := range wp.Risks {
		link := &wp.Risks[i]
		if link.CreatedAt.IsZero() {
			link.CreatedAt = wp.CreatedAt
		}
		_, err := execer.Exec(ctx,
			`INSERT INTO working_paper_risks (working_paper_id, risk_id, sort_order, source_mode, created_at)
			 VALUES ($1, $2, $3, $4, $5)`,
			wp.ID, link.RiskID, link.SortOrder, link.SourceMode, link.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("create working paper risk link: %w", err)
		}
		link.WorkingPaperID = wp.ID
	}
	return nil
}

func insertWorkingPaperSignatories(ctx context.Context, tx workingPaperTx, wp *entity.WorkingPaper) error {
	for i := range wp.Signatories {
		sig := &wp.Signatories[i]
		var createdAt interface{}
		err := tx.QueryRow(ctx,
			`INSERT INTO working_paper_signatories (working_paper_id, user_id, sequence_no, signer_name,
			        signer_nip, signer_jabatan, signer_pangkat, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id, created_at`,
			wp.ID, sig.UserID, sig.SequenceNo, sig.SignerName,
			sig.SignerNIP, sig.SignerJabatan, sig.SignerPangkat, sig.Status,
		).Scan(&sig.ID, &createdAt)
		if err != nil {
			return fmt.Errorf("create working paper signatory: %w", err)
		}
		sig.WorkingPaperID = wp.ID
	}
	return nil
}

// Create inserts a new working paper and its signatories in a transaction
func (r *workingPaperRepository) Create(ctx context.Context, wp *entity.WorkingPaper) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("create working paper begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`INSERT INTO working_papers (title, description, org_id, status, assessment_cycle,
		        document_hash, current_signatory_sequence, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at, updated_at`,
		wp.Title, wp.Description, wp.OrgID, wp.Status, wp.AssessmentCycle,
		wp.DocumentHash, wp.CurrentSignatorySequence, wp.CreatedBy,
	).Scan(&wp.ID, &wp.CreatedAt, &wp.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create working paper insert: %w", err)
	}

	if err := insertWorkingPaperRiskLinks(ctx, tx, wp); err != nil {
		return err
	}

	if err := insertWorkingPaperSignatories(ctx, tx, wp); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("create working paper commit: %w", err)
	}

	return nil
}

// GetByID retrieves a working paper by ID including its signatories
func (r *workingPaperRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.WorkingPaper, error) {
	return r.loadWorkingPaper(ctx, r.pool, id, false)
}

// List retrieves working papers with optional filters and pagination
func (r *workingPaperRepository) List(ctx context.Context, orgIDs []uuid.UUID, status string, page, limit int) ([]*entity.WorkingPaper, int, error) {
	countQuery := `SELECT COUNT(*) FROM working_papers WHERE 1=1`
	dataQuery := `SELECT id, title, description, org_id, status, assessment_cycle,
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

		if err := rows.Scan(
			&wp.ID, &wp.Title, &wp.Description, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
			&wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
			&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt,
		); err != nil {
			return nil, 0, fmt.Errorf("list working papers scan: %w", err)
		}

		risks, err := r.getWorkingPaperRisks(ctx, r.pool, wp.ID)
		if err != nil {
			return nil, 0, fmt.Errorf("list working papers get risks: %w", err)
		}
		wp.Risks = risks

		sigs, err := r.getSignatoriesByWorkingPaperID(ctx, r.pool, wp.ID)
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
	return r.updateWorkingPaper(ctx, r.pool, wp)
}

// Delete deletes a working paper by ID (cascade handles signatories)
func (r *workingPaperRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM working_papers WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete working paper: %w", err)
	}
	return nil
}

func (r *workingPaperRepository) MutateByIDForUpdate(ctx context.Context, id uuid.UUID, mutate func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("mutate working paper begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	wp, err := r.loadWorkingPaper(ctx, tx, id, true)
	if err != nil {
		return nil, fmt.Errorf("mutate working paper load locked row: %w", err)
	}

	if err := mutate(wp); err != nil {
		return nil, err
	}

	for i := range wp.Signatories {
		if err := r.updateSignatory(ctx, tx, &wp.Signatories[i]); err != nil {
			return nil, err
		}
	}
	if err := r.updateWorkingPaper(ctx, tx, wp); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("mutate working paper commit: %w", err)
	}

	return wp, nil
}

// GetSignatoriesByWorkingPaperID retrieves all signatories for a working paper
func (r *workingPaperRepository) GetSignatoriesByWorkingPaperID(ctx context.Context, wpID uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return r.getSignatoriesByWorkingPaperID(ctx, r.pool, wpID)
}

// UpdateSignatory updates a signatory's status and signing data
func (r *workingPaperRepository) UpdateSignatory(ctx context.Context, sig *entity.WorkingPaperSignatory) error {
	return r.updateSignatory(ctx, r.pool, sig)
}

// GetPendingSigningByUserID retrieves working papers pending the given user's signature
func (r *workingPaperRepository) GetPendingSigningByUserID(ctx context.Context, userID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.WorkingPaper, error) {
	query := `SELECT wp.id, wp.title, wp.description, wp.org_id, wp.status, wp.assessment_cycle,
		        wp.document_hash, wp.current_signatory_sequence, wp.created_by,
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

		if err := rows.Scan(
			&wp.ID, &wp.Title, &wp.Description, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
			&wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
			&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt,
		); err != nil {
			return nil, fmt.Errorf("scan pending signing working paper: %w", err)
		}

		risks, err := r.getWorkingPaperRisks(ctx, r.pool, wp.ID)
		if err != nil {
			return nil, fmt.Errorf("pending signing get risks: %w", err)
		}
		wp.Risks = risks

		sigs, err := r.getSignatoriesByWorkingPaperID(ctx, r.pool, wp.ID)
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

func (r *workingPaperRepository) HasBlockingDocumentLink(ctx context.Context, riskID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM working_paper_risks wpr
			INNER JOIN working_papers wp ON wp.id = wpr.working_paper_id
			WHERE wpr.risk_id = $1
			  AND wp.status IN ('signing', 'completed')
		)`,
		riskID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check blocking document link: %w", err)
	}

	return exists, nil
}
