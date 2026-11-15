package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
)

// ResolveMonitoringSource reads the profile that was actually effective on the
// observation date, even when the observation is entered after a later profile.
func (r *riskRepository) ResolveMonitoringSource(ctx context.Context, groupID uuid.UUID, date string, orgIDs []uuid.UUID) (*entity.Risk, error) {
	var id uuid.UUID
	var effective time.Time
	err := r.pool.QueryRow(ctx, `SELECT id,COALESCE(effective_from,(finalized_at AT TIME ZONE 'Asia/Jakarta')::date,(created_at AT TIME ZONE 'Asia/Jakarta')::date)
 FROM risks WHERE version_group_id=$1 AND EXISTS(SELECT 1 FROM risks active WHERE active.version_group_id=$1 AND active.is_current AND active.status='final' AND active.archived_at IS NULL) AND status='final' AND archived_at IS NULL AND superseded_by_risk_id IS NULL
 AND COALESCE(effective_from,(finalized_at AT TIME ZONE 'Asia/Jakarta')::date,(created_at AT TIME ZONE 'Asia/Jakarta')::date)<=$2::date
 AND (COALESCE(cardinality($3::uuid[]),0)=0 OR organization_id=ANY($3::uuid[]))
 ORDER BY COALESCE(effective_from,(finalized_at AT TIME ZONE 'Asia/Jakarta')::date,(created_at AT TIME ZONE 'Asia/Jakarta')::date) DESC, finalized_at DESC NULLS LAST,version_number DESC,id DESC LIMIT 1`, groupID, date, orgIDs).Scan(&id, &effective)
	if err != nil {
		return nil, err
	}
	risk, err := r.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, err
	}
	risk.EffectiveFrom = &effective
	return risk, nil
}

func (r *riskMonitoringRepository) GetOpenDraftByVersionGroup(ctx context.Context, groupID uuid.UUID) (*entity.RiskMonitoring, error) {
	monitoring, err := scanRiskMonitoring(r.pool.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.version_group_id=$1 AND rm.status='draft' AND rm.transaction_kind='monitoring' ORDER BY rm.created_at DESC,rm.id DESC LIMIT 1`, groupID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return monitoring, err
}
