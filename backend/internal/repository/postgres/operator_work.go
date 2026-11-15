package postgres

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	workuc "github.com/manris/backend/internal/usecase/operator_work"
	"time"
)

type OperatorWorkRepository struct{ pool *pgxpool.Pool }

func NewOperatorWorkRepository(pool *pgxpool.Pool) *OperatorWorkRepository {
	return &OperatorWorkRepository{pool: pool}
}

// A single statement gives all source branches one consistent read snapshot.
func (r *OperatorWorkRepository) ListCandidates(ctx context.Context, orgID uuid.UUID, now time.Time) ([]workuc.Candidate, error) {
	if orgID == uuid.Nil {
		return nil, fmt.Errorf("operator work requires organization")
	}
	rows, err := r.pool.Query(ctx, operatorWorkSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query operator work: %w", err)
	}
	defer rows.Close()
	result := make([]workuc.Candidate, 0)
	for rows.Next() {
		var c workuc.Candidate
		if err := rows.Scan(&c.Item.Key, &c.Item.Kind, &c.Item.TargetID, &c.Item.RiskID, &c.Item.RiskCode, &c.Item.RiskTitle, &c.Item.Period, &c.Item.DueDate, &c.Item.CreatedAt, &c.OwnerID, &c.PeriodEnd, &c.EffectiveCycle, &c.PreviousStatus, &c.Item.MitigationAction, &c.Item.MonitoringID); err != nil {
			return nil, fmt.Errorf("scan operator work: %w", err)
		}
		result = append(result, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read operator work: %w", err)
	}
	return result, nil
}

const operatorWorkSQL = `
WITH active AS (SELECT * FROM risks WHERE organization_id=$1 AND archived_at IS NULL AND archived_reason IS DISTINCT FROM 'superseded'),
active_families AS (SELECT version_group_id FROM active WHERE is_current AND status='final')
SELECT 'risk:'||id::text,'risk_draft',id::text,id::text,COALESCE(code,''),title,
 COALESCE(assessment_cycle,''),'',created_at,created_by,'','','','',''
FROM active WHERE status='draft'
UNION ALL
SELECT 'report:'||t.id::text,'mitigation_report',t.id::text,r.id::text,COALESCE(r.code,''),r.title,
 t.period_label,t.due_date::text,t.created_at,m.owner_user_id,t.period_end::text,'','',COALESCE(m.action,''),rm.id::text
FROM mitigation_tasks t JOIN mitigations m ON m.id=t.mitigation_id
JOIN risks r ON r.id=t.risk_id
JOIN active_families f ON f.version_group_id=r.version_group_id
JOIN risk_monitorings rm ON rm.id=t.monitoring_id AND rm.status='draft' AND rm.transaction_kind='monitoring'
LEFT JOIN monitoring_rule_periods rp ON rp.id=rm.monitoring_period_id
WHERE r.organization_id=$1 AND r.status='final' AND t.status IN ('pending','overdue') AND t.reported_at IS NULL
  AND (rp.id IS NULL OR ` + businessDateSQL + ` BETWEEN rp.opens_on AND rp.closes_on)
UNION ALL
SELECT 'monitor:'||rm.id::text,
 'monitoring_draft',rm.id::text,r.id::text,COALESCE(r.code,''),r.title,rm.assessment_cycle,
 '',rm.created_at,rm.started_by,'',COALESCE(r.assessment_cycle,''),'','',''
FROM risk_monitorings rm JOIN risks r ON r.id=rm.source_risk_id
JOIN active_families f ON f.version_group_id=rm.version_group_id
WHERE r.organization_id=$1 AND rm.status='draft' AND rm.transaction_kind='monitoring'
`
