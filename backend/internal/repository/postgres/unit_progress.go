package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type unitProgressRepository struct {
	pool *pgxpool.Pool
}

func NewUnitProgressRepository(pool *pgxpool.Pool) *unitProgressRepository {
	return &unitProgressRepository{pool: pool}
}

func (r *unitProgressRepository) ReadUnitProgress(ctx context.Context, period repository.QuarterlyReportPeriod, orgIDs []uuid.UUID) (*entity.UnitProgressSnapshot, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, fmt.Errorf("begin unit progress snapshot: %w", err)
	}
	defer tx.Rollback(ctx)

	var data entity.UnitProgressSnapshot
	data.Organizations, err = listQuarterlyOrganizations(ctx, tx, orgIDs)
	if err != nil {
		return nil, err
	}
	data.Risks, err = loadUnitProgressRisks(ctx, tx, period, orgIDs)
	if err != nil {
		return nil, err
	}
	data.WorkingPapers, err = loadUnitProgressPapers(ctx, tx, period.Cycle, orgIDs)
	if err != nil {
		return nil, err
	}
	data.Evaluations, err = loadUnitProgressEvaluations(ctx, tx, period.Cycle, orgIDs)
	if err != nil {
		return nil, err
	}
	data.Tasks, err = loadQuarterlyTasks(ctx, tx, period.Cycle, period.Start, period.End, orgIDs)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit unit progress snapshot: %w", err)
	}
	return &data, nil
}

func loadUnitProgressRisks(ctx context.Context, q riskQueryer, period repository.QuarterlyReportPeriod, orgIDs []uuid.UUID) ([]entity.UnitProgressRisk, error) {
	// Initial risk drafts are a separate population. Profile revisions live in
	// the monitoring transaction and must not increase the risk draft count.
	query := riskPeriodSnapshotCTE + `, progress_risks AS (
		SELECT id, organization_id, code, title, status, updated_at, version_group_id
		FROM risk_snapshots
		UNION ALL
		SELECT draft.id, draft.organization_id, draft.code, draft.title, draft.status, draft.updated_at, draft.version_group_id
		FROM risks draft
		WHERE draft.status = 'draft' AND draft.previous_risk_id IS NULL
		  AND draft.archived_at IS NULL AND draft.superseded_by_risk_id IS NULL
		  AND (draft.assessment_cycle = $1 OR (
		    COALESCE(draft.assessment_cycle, '') = '' AND draft.created_at >= $3 AND draft.created_at < $4))
		  AND NOT EXISTS (
		    SELECT 1 FROM risks final WHERE final.version_group_id = draft.version_group_id AND final.status = 'final'
		  )
	)
	SELECT r.id, r.organization_id, COALESCE(r.code, ''), r.title, r.status,
	       r.updated_at, monitoring.id,
	       COALESCE(monitoring.status, ''), COALESCE(monitoring.mode = 'with_profile_revision', false)
	FROM progress_risks r
	LEFT JOIN LATERAL (
		SELECT m.id, m.status, m.mode, m.updated_at
		FROM risk_monitorings m
		WHERE r.status = 'final' AND m.version_group_id = r.version_group_id
		  AND m.assessment_cycle = $1 AND m.status IN ('draft', 'final')
		  AND m.superseded_by_monitoring_id IS NULL
		ORDER BY (m.status = 'final') DESC, m.finalized_at DESC NULLS LAST, m.updated_at DESC, m.id DESC
		LIMIT 1
	) monitoring ON TRUE
	WHERE r.organization_id IS NOT NULL
	  AND (cardinality($2::uuid[]) = 0 OR r.organization_id = ANY($2::uuid[]))
	ORDER BY r.code, r.title, r.id`
	rows, err := q.Query(ctx, query, period.Cycle, uuidArrayToStrings(orgIDs), period.Start, period.End)
	if err != nil {
		return nil, fmt.Errorf("load unit progress risks: %w", err)
	}
	defer rows.Close()

	items := make([]entity.UnitProgressRisk, 0)
	for rows.Next() {
		var item entity.UnitProgressRisk
		var monitoringID uuid.NullUUID
		err := rows.Scan(&item.ID, &item.OrganizationID, &item.Code, &item.Title, &item.Status,
			&item.UpdatedAt, &monitoringID, &item.MonitoringStatus, &item.ProfileChanged)
		if err != nil {
			return nil, fmt.Errorf("scan unit progress risk: %w", err)
		}
		item.MonitoringID = nullableUUIDPtr(monitoringID)
		items = append(items, item)
	}
	return items, rows.Err()
}

func loadUnitProgressPapers(ctx context.Context, q riskQueryer, cycle string, orgIDs []uuid.UUID) ([]entity.UnitProgressWorkingPaper, error) {
	rows, err := q.Query(ctx, `
		SELECT wp.id, wp.org_id, wp.code, wp.title, wp.status, wp.updated_at, wp.tte_skipped,
		       s.signed, s.total, COALESCE(s.next_signer, '')
		FROM working_papers wp
		CROSS JOIN LATERAL (
			SELECT COUNT(*) FILTER (WHERE status = 'signed') AS signed, COUNT(*) AS total,
			       MAX(signer_name) FILTER (WHERE wp.status = 'signing' AND status = 'pending'
			         AND sequence_no = wp.current_signatory_sequence + 1) AS next_signer
			FROM working_paper_signatories WHERE working_paper_id = wp.id
		) s
		WHERE wp.assessment_cycle = $1 AND (cardinality($2::uuid[]) = 0 OR wp.org_id = ANY($2::uuid[]))
		ORDER BY (wp.status = 'cancelled'), wp.updated_at DESC, wp.id`,
		cycle, uuidArrayToStrings(orgIDs))
	if err != nil {
		return nil, fmt.Errorf("load unit progress working papers: %w", err)
	}
	defer rows.Close()

	items := make([]entity.UnitProgressWorkingPaper, 0)
	for rows.Next() {
		var item entity.UnitProgressWorkingPaper
		err := rows.Scan(&item.ID, &item.OrganizationID, &item.Code, &item.Title, &item.Status, &item.UpdatedAt,
			&item.TTESkipped, &item.Signed, &item.Signers, &item.NextSigner)
		if err != nil {
			return nil, fmt.Errorf("scan unit progress working paper: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func loadUnitProgressEvaluations(ctx context.Context, q riskQueryer, cycle string, orgIDs []uuid.UUID) ([]entity.UnitProgressItem, error) {
	rows, err := q.Query(ctx, `
		SELECT e.id, e.organization_id, e.code, COALESCE(t.name, ''), e.status, e.updated_at
		FROM evaluations e LEFT JOIN evaluation_templates t ON t.id = e.template_id
		WHERE e.period = $1 AND (cardinality($2::uuid[]) = 0 OR e.organization_id = ANY($2::uuid[]))
		ORDER BY t.name, e.updated_at DESC, e.id`, cycle, uuidArrayToStrings(orgIDs))
	if err != nil {
		return nil, fmt.Errorf("load unit progress evaluations: %w", err)
	}
	defer rows.Close()

	items := make([]entity.UnitProgressItem, 0)
	for rows.Next() {
		var item entity.UnitProgressItem
		if err := rows.Scan(&item.ID, &item.OrganizationID, &item.Code, &item.Title, &item.Status, &item.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan unit progress evaluation: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
