package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func ensureMonitoringReportTasks(ctx context.Context, q riskQueryer, m *entity.RiskMonitoring) error {
	start, end, err := monitoringEvidenceWindow(m.AssessmentCycle)
	if err != nil {
		return err
	}
	dueDate := end.AddDate(0, 0, -1).Format(time.DateOnly)
	configured := m.ProfileVersionID != nil && m.MonitoringPeriodID != nil
	if configured {
		var year, ordinal int
		var frequency string
		if err := q.QueryRow(ctx, `SELECT p.year,r.frequency,rp.ordinal,rp.closes_on::text FROM annual_risk_profile_versions p JOIN monitoring_rules r ON r.id=p.monitoring_rule_id JOIN monitoring_rule_periods rp ON rp.rule_id=r.id WHERE p.id=$1 AND rp.id=$2`, m.ProfileVersionID, m.MonitoringPeriodID).Scan(&year, &frequency, &ordinal, &dueDate); err != nil {
			return err
		}
		start, end, err = entity.MonitoringPeriodCalendarBounds(year, frequency, ordinal)
		if err != nil {
			return err
		}
		end = end.AddDate(0, 0, 1)
	}
	_, err = q.Exec(ctx, `INSERT INTO mitigation_tasks(mitigation_id,risk_id,monitoring_id,period_label,period_start,period_end,due_date,status,generated_by)
 SELECT id,risk_id,$2,$3,$4::date,$5::date,CASE WHEN $7 THEN $6::date ELSE COALESCE(due_date,$6::date) END,'pending','manual' FROM mitigations WHERE risk_id=$1
 ON CONFLICT(monitoring_id,mitigation_id) WHERE monitoring_id IS NOT NULL DO NOTHING`, m.SourceRiskID, m.ID, m.AssessmentCycle, start.Format(time.DateOnly), end.AddDate(0, 0, -1).Format(time.DateOnly), dueDate, configured)
	if err != nil {
		return fmt.Errorf("create monitoring report items: %w", err)
	}
	return nil
}

// Start retries reopen the existing revision rather than creating parallel drafts.
func (r *riskMonitoringRepository) GetOpenRevision(ctx context.Context, group uuid.UUID) (*entity.RiskMonitoring, error) {
	if err := checkRiskRevisionPeriod(ctx, r.pool, group); err != nil {
		return nil, err
	}
	return scanRiskMonitoring(r.pool.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.version_group_id=$1 AND rm.transaction_kind='revision' AND rm.status='draft' LIMIT 1`, group))
}

func (r *riskMonitoringRepository) EnsureDraftReports(ctx context.Context, m *entity.RiskMonitoring) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var status, kind string
	if err := tx.QueryRow(ctx, "SELECT status,transaction_kind FROM risk_monitorings WHERE id=$1 FOR UPDATE", m.ID).Scan(&status, &kind); err != nil {
		return err
	}
	if status != "draft" || kind != "monitoring" {
		return nil
	}
	if err := ensureMonitoringReportTasks(ctx, tx, m); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
