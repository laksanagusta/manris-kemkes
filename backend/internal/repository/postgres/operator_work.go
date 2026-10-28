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
	rows, err := r.pool.Query(ctx, operatorWorkSQL, orgID, now)
	if err != nil {
		return nil, fmt.Errorf("query operator work: %w", err)
	}
	defer rows.Close()
	result := make([]workuc.Candidate, 0)
	for rows.Next() {
		var c workuc.Candidate
		if err := rows.Scan(&c.Item.Key, &c.Item.Kind, &c.Item.TargetID, &c.Item.RiskID, &c.Item.RiskCode, &c.Item.RiskTitle, &c.Item.Period, &c.Item.DueDate, &c.Item.CreatedAt, &c.OwnerID, &c.PeriodEnd, &c.EffectiveCycle, &c.PreviousStatus, &c.Item.MitigationAction); err != nil {
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
WITH clock AS (SELECT date_trunc('quarter', $2::timestamptz AT TIME ZONE 'Asia/Jakarta')::date AS quarter_start),
cycles AS (SELECT start_date, to_char(start_date,'YYYY-"Q"Q') AS cycle,
 to_char(start_date - interval '3 months','YYYY-"Q"Q') AS previous_cycle
 FROM clock CROSS JOIN LATERAL (VALUES (quarter_start),( (quarter_start - interval '3 months')::date)) q(start_date)),
active AS (SELECT * FROM risks WHERE organization_id=$1 AND archived_at IS NULL AND archived_reason IS DISTINCT FROM 'superseded')
SELECT 'risk:'||id::text,'risk_draft',id::text,id::text,COALESCE(code,''),title,
 COALESCE(assessment_cycle,''),'',created_at,created_by,'','','',''
FROM active WHERE status='draft'
UNION ALL
SELECT 'report:'||t.id::text,'mitigation_report',t.id::text,r.id::text,COALESCE(r.code,''),r.title,
 t.period_label,t.due_date::text,t.created_at,m.owner_user_id,t.period_end::text,'','',COALESCE(m.action,'')
FROM mitigation_tasks t JOIN mitigations m ON m.id=t.mitigation_id JOIN active r ON r.id=t.risk_id
WHERE r.status='final' AND r.is_current AND t.status IN ('pending','overdue')
UNION ALL
SELECT 'monitor:'||r.version_group_id::text||':'||c.cycle,
 'monitoring_start',
 COALESCE(rm.id,r.id)::text,r.id::text,COALESCE(r.code,''),r.title,c.cycle,
 COALESCE(p.due_date::text,''),COALESCE(rm.created_at,r.created_at),rm.started_by,'',
 COALESCE(NULLIF(r.assessment_cycle,''),to_char(COALESCE(r.effective_from,r.finalized_at,r.created_at) AT TIME ZONE 'Asia/Jakarta','YYYY-"Q"Q')),
 COALESCE(prev.status,''),''
FROM active r CROSS JOIN cycles c
LEFT JOIN risk_monitorings rm ON rm.version_group_id=r.version_group_id AND rm.assessment_cycle=c.cycle AND rm.status<>'superseded'
LEFT JOIN risk_monitorings prev ON prev.version_group_id=r.version_group_id AND prev.assessment_cycle=c.previous_cycle AND prev.status<>'superseded'
LEFT JOIN risk_monitoring_periods p ON p.version_group_id=r.version_group_id AND p.period_label=c.cycle
WHERE r.status='final' AND r.is_current AND rm.id IS NULL
UNION ALL
SELECT 'monitor:'||r.version_group_id::text||':'||rm.assessment_cycle,
 'monitoring_draft',rm.id::text,r.id::text,COALESCE(r.code,''),r.title,rm.assessment_cycle,
 COALESCE(p.due_date::text,''),rm.created_at,rm.started_by,'',COALESCE(r.assessment_cycle,''),'',''
FROM risk_monitorings rm JOIN active r ON r.id=rm.source_risk_id
LEFT JOIN risk_monitoring_periods p ON p.version_group_id=rm.version_group_id AND p.period_label=rm.assessment_cycle
WHERE r.status='final' AND r.is_current AND rm.status='draft'
`
