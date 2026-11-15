package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

// Both start paths take this lock before inspecting or creating any draft,
// including monitoring with an explicit annual-profile/period context.
func lockRiskWorkflow(ctx context.Context, q riskQueryer, group uuid.UUID) error {
	_, err := q.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1::text,85))`, group.String())
	if err != nil {
		return fmt.Errorf("lock risk workflow: %w", err)
	}
	return nil
}

func readRiskOpenDrafts(ctx context.Context, q riskQueryer, group uuid.UUID) (*entity.RiskOpenDrafts, error) {
	var drafts entity.RiskOpenDrafts
	err := q.QueryRow(ctx, `SELECT
 (SELECT id FROM risk_monitorings WHERE version_group_id=$1 AND status='draft' AND transaction_kind='monitoring' ORDER BY started_at,id LIMIT 1),
 (SELECT id FROM risks WHERE version_group_id=$1 AND status='draft' AND previous_risk_id IS NOT NULL AND review_type='revision' AND archived_at IS NULL ORDER BY created_at,id LIMIT 1),
 (SELECT id FROM risk_monitorings WHERE version_group_id=$1 AND status='draft' AND transaction_kind='revision' ORDER BY started_at,id LIMIT 1)`, group).Scan(&drafts.MonitoringID, &drafts.RevisionRiskID, &drafts.RevisionMonitoringID)
	if err != nil {
		return nil, fmt.Errorf("read open risk workflows: %w", err)
	}
	return &drafts, nil
}

func checkMonitoringDraftStart(ctx context.Context, q riskQueryer, group uuid.UUID, kind string) error {
	drafts, err := readRiskOpenDrafts(ctx, q, group)
	if err != nil {
		return err
	}
	if kind == "monitoring" && (drafts.RevisionRiskID != nil || drafts.RevisionMonitoringID != nil) {
		return domainerrors.ErrRiskRevisionInProgress
	}
	if drafts.MonitoringID != nil {
		return domainerrors.ErrRiskMonitoringInProgress
	}
	if kind == "revision" && drafts.RevisionRiskID != nil {
		return domainerrors.ErrRiskRevisionInProgress
	}
	return nil
}
