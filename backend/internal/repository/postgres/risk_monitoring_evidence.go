package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
	riskuc "github.com/manris/backend/internal/usecase/risk"
	"time"
)

type RiskMonitoringEvidenceRepository struct{ pool *pgxpool.Pool }

func NewRiskMonitoringEvidenceRepository(pool *pgxpool.Pool) *RiskMonitoringEvidenceRepository {
	return &RiskMonitoringEvidenceRepository{pool: pool}
}
func monitoringEvidenceWindow(cycle string) (time.Time, time.Time, error) {
	index, err := riskuc.CycleIndex(cycle)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	start := time.Date(index/4, time.Month((index%4)*3+1), 1, 0, 0, 0, 0, timeutil.JakartaLocation())
	return start, start.AddDate(0, 3, 0), nil
}
func (r *RiskMonitoringEvidenceRepository) Get(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoringEvidenceResult, error) {
	var sourceID uuid.UUID
	var cycle, status string
	var snapshot []byte
	err := r.pool.QueryRow(ctx, `SELECT rm.source_risk_id,rm.assessment_cycle,rm.status,rm.evidence_snapshot FROM risk_monitorings rm JOIN risks r ON r.id=rm.source_risk_id WHERE rm.id=$1 AND (cardinality($2::uuid[])=0 OR r.organization_id=ANY($2::uuid[]))`, id, uuidArrayToStrings(orgIDs)).Scan(&sourceID, &cycle, &status, &snapshot)
	if err != nil {
		return nil, fmt.Errorf("get evidence monitoring: %w", err)
	}
	result := &entity.RiskMonitoringEvidenceResult{Final: status != "draft"}
	if result.Final {
		if len(snapshot) > 0 {
			var evidence entity.RiskMonitoringEvidence
			if err := json.Unmarshal(snapshot, &evidence); err != nil {
				return nil, fmt.Errorf("decode monitoring evidence: %w", err)
			}
			result.Evidence = &evidence
		}
		return result, nil
	}
	evidence, err := readMonitoringEvidence(ctx, r.pool, sourceID, id, cycle, timeutil.BusinessNow().UTC())
	if err != nil {
		return nil, err
	}
	result.Evidence = evidence
	return result, nil
}

// The same queryer is used inside finalization so a failure rolls back the result.
func readMonitoringEvidence(ctx context.Context, q riskQueryer, sourceID, monitoringID uuid.UUID, cycle string, capturedAt time.Time) (*entity.RiskMonitoringEvidence, error) {
	start, end, err := monitoringEvidenceWindow(cycle)
	if err != nil {
		return nil, err
	}
	var observed time.Time
	var year, ordinal *int
	var frequency *string
	if err := q.QueryRow(ctx, `SELECT rm.observed_at,p.year,r.frequency,rp.ordinal FROM risk_monitorings rm LEFT JOIN annual_risk_profile_versions p ON p.id=rm.profile_version_id LEFT JOIN monitoring_rules r ON r.id=p.monitoring_rule_id LEFT JOIN monitoring_rule_periods rp ON rp.id=rm.monitoring_period_id WHERE rm.id=$1`, monitoringID).Scan(&observed, &year, &frequency, &ordinal); err != nil {
		return nil, fmt.Errorf("read observation cutoff: %w", err)
	}
	if year != nil && frequency != nil && ordinal != nil {
		var last time.Time
		start, last, err = entity.MonitoringPeriodCalendarBounds(*year, *frequency, *ordinal)
		if err != nil {
			return nil, err
		}
		end = last.AddDate(0, 0, 1)
	}
	observationEnd := time.Date(observed.Year(), observed.Month(), observed.Day(), 0, 0, 0, 0, timeutil.JakartaLocation()).AddDate(0, 0, 1)
	if observationEnd.Before(end) {
		end = observationEnd
	}
	evidence := &entity.RiskMonitoringEvidence{CapturedAt: capturedAt, Reports: []entity.MonitoringEvidenceReport{}, Events: []entity.MonitoringEvidenceEvent{}}
	var groupID, orgID uuid.UUID
	if err := q.QueryRow(ctx, `SELECT version_group_id,organization_id,title,COALESCE(nilai,0),COALESCE(target_nilai,0) FROM risks WHERE id=$1`, sourceID).Scan(&groupID, &orgID, &evidence.Title, &evidence.SourceScore, &evidence.TargetScore); err != nil {
		return nil, fmt.Errorf("read evidence profile: %w", err)
	}
	reports, err := q.Query(ctx, `SELECT t.id,m.action,
 CASE WHEN t.reported_at < $6 THEN t.status ELSE 'pending' END,
 CASE WHEN t.reported_at < $6 THEN COALESCE(t.notes,'') ELSE '' END,
 CASE WHEN t.reported_at < $6 THEN COALESCE(t.evidence_url,'') ELSE '' END,
 CASE WHEN t.reported_at < $6 THEN t.reported_at ELSE NULL END
 FROM mitigation_tasks t JOIN mitigations m ON m.id=t.mitigation_id JOIN risks r ON r.id=t.risk_id
 WHERE r.version_group_id=$1 AND r.organization_id=$2 AND
 (t.monitoring_id=$3 OR (t.period_end >= $4::date AND t.period_start < $5::date))
 AND t.created_at < $6 ORDER BY t.period_start,t.id`, groupID, orgID, monitoringID, start.Format("2006-01-02"), end.Format("2006-01-02"), end)
	if err != nil {
		return nil, fmt.Errorf("read evidence reports: %w", err)
	}
	for reports.Next() {
		var report entity.MonitoringEvidenceReport
		if err := reports.Scan(&report.ID, &report.Action, &report.Status, &report.Notes, &report.EvidenceURL, &report.ReportedAt); err != nil {
			reports.Close()
			return nil, fmt.Errorf("scan evidence report: %w", err)
		}
		evidence.Reports = append(evidence.Reports, report)
	}
	reports.Close()
	if err := reports.Err(); err != nil {
		return nil, fmt.Errorf("read reports: %w", err)
	}
	events, err := q.Query(ctx, `SELECT i.id,COALESCE(i.code,''),i.what,i."when",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'eventId',n.event_id,'body',n.body,'createdBy',n.created_by,'createdByName',COALESCE(u.name,''),'createdAt',n.created_at) ORDER BY n.created_at,n.id)
 FROM risk_event_notes n LEFT JOIN users u ON u.id=n.created_by WHERE n.event_id=i.id AND n.created_at<=$5),'[]'::jsonb)
 FROM incidents i WHERE i.organization_id=$2 AND i."when">=$3 AND i."when"<$4 AND i.created_at<=$5
 AND (EXISTS(SELECT 1 FROM incident_risk_links l JOIN risks r ON r.id=l.risk_id WHERE l.incident_id=i.id AND r.version_group_id=$1 AND r.organization_id=$2 AND l.created_at<=$5)
 OR EXISTS(SELECT 1 FROM risks r WHERE r.id=i.linked_risk_id AND r.version_group_id=$1 AND r.organization_id=$2)) ORDER BY i."when",i.id`, groupID, orgID, start, end, capturedAt)
	if err != nil {
		return nil, fmt.Errorf("read evidence events: %w", err)
	}
	defer events.Close()
	for events.Next() {
		var event entity.MonitoringEvidenceEvent
		var notes []byte
		if err := events.Scan(&event.ID, &event.Code, &event.Description, &event.OccurredAt, &notes); err != nil {
			return nil, fmt.Errorf("scan evidence event: %w", err)
		}
		if err := json.Unmarshal(notes, &event.Notes); err != nil {
			return nil, fmt.Errorf("decode event notes: %w", err)
		}
		evidence.Events = append(evidence.Events, event)
	}
	if err := events.Err(); err != nil {
		return nil, fmt.Errorf("read events: %w", err)
	}
	return evidence, nil
}
