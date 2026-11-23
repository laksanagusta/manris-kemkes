package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func lockRiskRevisionOrganization(ctx context.Context, q riskQueryer, source uuid.UUID) error {
	_, err := q.Exec(ctx, `SELECT o.id FROM risks r JOIN organizations o ON o.id=r.organization_id
		WHERE r.id=$1 FOR NO KEY UPDATE OF o`, source)
	return err
}

func riskRevisionBlockingPeriod(ctx context.Context, q riskQueryer, group uuid.UUID, period *uuid.UUID) (*string, error) {
	var label string
	err := q.QueryRow(ctx, `WITH profiles AS (
		SELECT DISTINCT ON (p.year) p.id,p.year
		FROM annual_risk_profile_versions p JOIN risks r ON r.organization_id=p.organization_id
		WHERE r.version_group_id=$1 AND r.is_current AND p.finalized_at IS NOT NULL AND p.monitoring_rule_id IS NOT NULL
		ORDER BY p.year,p.version DESC
	)
	SELECT progress.label FROM profiles p
	CROSS JOIN LATERAL annual_monitoring_revision_periods(p.id) progress
	WHERE progress.blocks_revision AND ($2::uuid IS NULL OR progress.period_id=$2)
		AND EXISTS (SELECT 1 FROM annual_monitoring_period_scope(p.id,progress.period_id) member WHERE member.version_group_id=$1)
	ORDER BY p.year,progress.ordinal LIMIT 1`, group, period).Scan(&label)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("check unfinished monitoring for risk revision: %w", err)
	}
	return &label, nil
}

func checkRiskRevisionPeriod(ctx context.Context, q riskQueryer, group uuid.UUID) error {
	period, err := riskRevisionBlockingPeriod(ctx, q, group, nil)
	if err != nil || period == nil {
		return err
	}
	return &domainerrors.AppError{
		Code:    domainerrors.ErrRiskRevisionPeriodInProgress.Code,
		Message: fmt.Sprintf("Selesaikan pemantauan %s, Kertas Kerja, dan Evaluasi sebelum merevisi risiko. Jika jendela sudah ditutup, minta penutupan administratif dari Super Admin.", *period),
		Err:     domainerrors.ErrRiskRevisionPeriodInProgress,
	}
}

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
 (SELECT rm.id FROM risk_monitorings rm WHERE rm.version_group_id=$1 AND rm.status='draft' AND rm.transaction_kind='monitoring'
  AND NOT EXISTS (
    SELECT 1 FROM annual_monitoring_period_completion completion
    JOIN annual_risk_profile_versions profile ON profile.organization_id=completion.organization_id
    WHERE profile.id=rm.profile_version_id AND completion.monitoring_period_id=rm.monitoring_period_id
      AND completion.approved_at IS NOT NULL
  ) ORDER BY rm.started_at,rm.id LIMIT 1),
 (SELECT id FROM risks WHERE version_group_id=$1 AND status='draft' AND previous_risk_id IS NOT NULL AND review_type='revision' AND archived_at IS NULL ORDER BY created_at,id LIMIT 1),
 (SELECT id FROM risk_monitorings WHERE version_group_id=$1 AND status='draft' AND transaction_kind='revision' ORDER BY started_at,id LIMIT 1)`, group).Scan(&drafts.MonitoringID, &drafts.RevisionRiskID, &drafts.RevisionMonitoringID)
	if err != nil {
		return nil, fmt.Errorf("read open risk workflows: %w", err)
	}
	return &drafts, nil
}

func checkMonitoringDraftStart(ctx context.Context, q riskQueryer, monitoring *entity.RiskMonitoring) error {
	drafts, err := readRiskOpenDrafts(ctx, q, monitoring.VersionGroupID)
	if err != nil {
		return err
	}
	if monitoring.TransactionKind == "monitoring" && (drafts.RevisionRiskID != nil || drafts.RevisionMonitoringID != nil) {
		if monitoring.MonitoringPeriodID == nil {
			return domainerrors.ErrRiskRevisionInProgress
		}
		period, err := riskRevisionBlockingPeriod(ctx, q, monitoring.VersionGroupID, monitoring.MonitoringPeriodID)
		if err != nil {
			return err
		}
		if period == nil {
			return domainerrors.ErrRiskRevisionInProgress
		}
	}
	if drafts.MonitoringID != nil {
		return domainerrors.ErrRiskMonitoringInProgress
	}
	if monitoring.TransactionKind == "revision" && drafts.RevisionRiskID != nil {
		return domainerrors.ErrRiskRevisionInProgress
	}
	return nil
}
