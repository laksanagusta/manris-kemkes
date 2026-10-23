package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
)

// DocumentAnalysisTaskRepository reads only the fields external matching needs.
// It is separate from the operational repository to avoid loading report content.
type DocumentAnalysisTaskRepository struct {
	pool *pgxpool.Pool
}

func NewDocumentAnalysisTaskRepository(pool *pgxpool.Pool) *DocumentAnalysisTaskRepository {
	return &DocumentAnalysisTaskRepository{pool: pool}
}

func (r *DocumentAnalysisTaskRepository) ListForDocumentAnalysis(ctx context.Context, orgIDs []uuid.UUID, limit int) ([]entity.DocumentMitigationTaskContext, error) {
	if len(orgIDs) != 1 {
		return nil, fmt.Errorf("document matching requires one organization")
	}
	rows, err := r.pool.Query(ctx, `
		SELECT t.id::text, COALESCE(r.code, ''), COALESCE(r.title, ''),
		       COALESCE(m.action, ''), t.period_label
		FROM mitigation_tasks t
		JOIN mitigations m ON m.id = t.mitigation_id
		JOIN risks r ON r.id = t.risk_id
		WHERE r.organization_id = ANY($1::uuid[])
		  AND r.status = 'final'
		  AND r.is_current = TRUE
		  AND r.is_cycle_current = TRUE
		  AND r.archived_at IS NULL
		  AND r.superseded_by_risk_id IS NULL
		  AND t.status IN ('pending', 'overdue')
		ORDER BY t.id
		LIMIT $2`, orgIDs, limit)
	if err != nil {
		return nil, fmt.Errorf("query document matching tasks: %w", err)
	}
	defer rows.Close()
	tasks := make([]entity.DocumentMitigationTaskContext, 0)
	for rows.Next() {
		var task entity.DocumentMitigationTaskContext
		if err := rows.Scan(&task.ID, &task.RiskCode, &task.RiskTitle, &task.MitigationAction, &task.PeriodLabel); err != nil {
			return nil, fmt.Errorf("scan document matching task: %w", err)
		}
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read document matching tasks: %w", err)
	}
	return tasks, nil
}
