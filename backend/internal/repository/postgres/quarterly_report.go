package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// Supersession archives are version transitions, never manual lifecycle ends.
// Recent audited archive/restore transitions supplement the legacy metadata.
const quarterlyLifecycleCTE = `WITH lifecycle_events AS (
    SELECT a.id, r.version_group_id, a.action, a.created_at
    FROM audit_logs a JOIN risks r ON r.id = a.entity_id
    WHERE a.entity_type = 'risk' AND a.action IN ('archive', 'restore')
), latest_profiles AS (
    SELECT DISTINCT ON (version_group_id) version_group_id, archived_at, archived_reason
    FROM risks WHERE status = 'final' AND superseded_by_risk_id IS NULL
    ORDER BY version_group_id, COALESCE(assessment_cycle, '') DESC, version_number DESC, created_at DESC, id DESC
), lifecycle AS (
    SELECT version_group_id,
           CASE WHEN archived_reason = 'superseded by periodic reassessment' THEN NULL ELSE archived_at END AS archived_at
    FROM latest_profiles
)`

type quarterlyReportRepository struct{ pool *pgxpool.Pool }

func NewQuarterlyReportRepository(pool *pgxpool.Pool) repository.QuarterlyReportRepository {
	return &quarterlyReportRepository{pool: pool}
}

func (r *quarterlyReportRepository) ListOrganizations(ctx context.Context, orgIDs []uuid.UUID) ([]entity.QuarterlyReportOrganization, error) {
	return listQuarterlyOrganizations(ctx, r.pool, orgIDs)
}

func listQuarterlyOrganizations(ctx context.Context, q riskQueryer, orgIDs []uuid.UUID) ([]entity.QuarterlyReportOrganization, error) {
	rows, err := q.Query(ctx, `SELECT id, name FROM organizations WHERE cardinality($1::uuid[]) = 0 OR id = ANY($1::uuid[]) ORDER BY name, id`, uuidArrayToStrings(orgIDs))
	if err != nil {
		return nil, fmt.Errorf("list quarterly organizations: %w", err)
	}
	defer rows.Close()
	result := make([]entity.QuarterlyReportOrganization, 0)
	for rows.Next() {
		var org entity.QuarterlyReportOrganization
		if err := rows.Scan(&org.ID, &org.Name); err != nil {
			return nil, err
		}
		result = append(result, org)
	}
	return result, rows.Err()
}

func (r *quarterlyReportRepository) LoadPeriod(ctx context.Context, cycle string, start, end time.Time, orgIDs []uuid.UUID) (*entity.QuarterlyReportPeriodData, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, fmt.Errorf("begin quarterly read: %w", err)
	}
	defer tx.Rollback(ctx)
	result, err := loadQuarterlyPeriod(ctx, tx, cycle, start, end, orgIDs)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit quarterly read: %w", err)
	}
	return result, nil
}

// Both periods and the organization list share one repeatable-read snapshot.
func (r *quarterlyReportRepository) ReadSnapshot(ctx context.Context, current, previous repository.QuarterlyReportPeriod, orgIDs []uuid.UUID) (*entity.QuarterlyReportSnapshot, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	orgs, err := listQuarterlyOrganizations(ctx, tx, orgIDs)
	if err != nil {
		return nil, err
	}
	a, err := loadQuarterlyPeriod(ctx, tx, current.Cycle, current.Start, current.End, orgIDs)
	if err != nil {
		return nil, err
	}
	b, err := loadQuarterlyPeriod(ctx, tx, previous.Cycle, previous.Start, previous.End, orgIDs)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &entity.QuarterlyReportSnapshot{Organizations: orgs, Current: a, Previous: b}, nil
}

func loadQuarterlyPeriod(ctx context.Context, q riskQueryer, cycle string, start, end time.Time, orgIDs []uuid.UUID) (*entity.QuarterlyReportPeriodData, error) {
	risks, updated, err := loadQuarterlyRisks(ctx, q, cycle, start, end, orgIDs)
	if err != nil {
		return nil, err
	}
	tasks, err := loadQuarterlyTasks(ctx, q, cycle, start, end, orgIDs)
	if err != nil {
		return nil, err
	}
	events, err := loadQuarterlyEvents(ctx, q, start, end, orgIDs)
	if err != nil {
		return nil, err
	}
	for _, task := range tasks {
		updated = latestQuarterlyUpdate(updated, task.UpdatedAt)
	}
	for _, event := range events {
		updated = latestQuarterlyUpdate(updated, event.UpdatedAt)
	}
	return &entity.QuarterlyReportPeriodData{
		Risks: risks, Tasks: tasks, Events: events, DataUpdatedAt: updated,
		Warnings: []string{
			"Riwayat arsip/pemulihan sebelum pencatatan audit lifecycle tidak lengkap; risiko yang pernah dipulihkan tidak selalu dapat direkonstruksi untuk periode lama.",
			"Laporan mitigasi yang pernah terhapus oleh pembaruan atau pengarsipan lama tidak dapat dipulihkan dari data yang tersedia.",
		},
	}, nil
}

func latestQuarterlyUpdate(current *time.Time, value time.Time) *time.Time {
	if value.IsZero() || (current != nil && !value.After(*current)) {
		return current
	}
	copy := value
	return &copy
}

// A monitoring-linked task belongs to the monitoring's quarter regardless of
// submission time. Other task frequencies belong to their period-end quarter.
// Corrections supersede old monitoring tasks instead of duplicating them.
func loadQuarterlyTasks(ctx context.Context, q riskQueryer, cycle string, start, end time.Time, orgIDs []uuid.UUID) ([]*entity.QuarterlyReportTask, error) {
	rows, err := q.Query(ctx, `
	 SELECT t.id, t.mitigation_id, t.risk_id, t.monitoring_id,
	        t.period_label, t.period_start::text, t.period_end::text, t.due_date::text,
	        t.status, t.evidence_url, t.notes, t.report_output, t.report_obstacle,
	        t.reported_by, t.reported_at, t.generated_by, t.created_at, t.updated_at,
	        COALESCE(m.action, ''), COALESCE(m.owner, ''), COALESCE(r.code, ''), COALESCE(r.title, ''),
		COALESCE(u.name, ''), COALESCE(r.organization_id, '00000000-0000-0000-0000-000000000000'::uuid), r.version_group_id
	 FROM mitigation_tasks t
	 JOIN risks r ON r.id = t.risk_id
	 LEFT JOIN mitigations m ON m.id = t.mitigation_id
	 LEFT JOIN risk_monitorings rm ON rm.id = t.monitoring_id
	 LEFT JOIN users u ON u.id = t.reported_by
	 WHERE (cardinality($4::uuid[]) = 0 OR r.organization_id = ANY($4::uuid[]))
	   AND r.superseded_by_risk_id IS NULL
	   AND CASE WHEN t.monitoring_id IS NOT NULL
	       THEN rm.assessment_cycle = $1 AND rm.status <> 'superseded' AND rm.superseded_by_monitoring_id IS NULL
	       ELSE t.period_end >= $2::date AND t.period_end < $3::date END
	 ORDER BY t.due_date, t.id`, cycle, start.Format("2006-01-02"), end.Format("2006-01-02"), uuidArrayToStrings(orgIDs))
	if err != nil {
		return nil, fmt.Errorf("load quarterly mitigation tasks: %w", err)
	}
	defer rows.Close()
	result := make([]*entity.QuarterlyReportTask, 0)
	for rows.Next() {
		task := &entity.QuarterlyReportTask{MitigationTask: &entity.MitigationTask{}}
		if err := rows.Scan(&task.ID, &task.MitigationID, &task.RiskID, &task.MonitoringID,
			&task.PeriodLabel, &task.PeriodStart, &task.PeriodEnd, &task.DueDate,
			&task.Status, &task.EvidenceURL, &task.Notes, &task.ReportOutput, &task.ReportObstacle,
			&task.ReportedBy, &task.ReportedAt, &task.GeneratedBy, &task.CreatedAt, &task.UpdatedAt,
			&task.MitigationAction, &task.MitigationOwner, &task.RiskCode, &task.RiskTitle,
			&task.ReportedByName, &task.OrganizationID, &task.VersionGroupID); err != nil {
			return nil, fmt.Errorf("scan quarterly task: %w", err)
		}
		result = append(result, task)
	}
	return result, rows.Err()
}

func loadQuarterlyEvents(ctx context.Context, q riskQueryer, start, end time.Time, orgIDs []uuid.UUID) ([]*entity.RiskEvent, error) {
	rows, err := q.Query(ctx, riskEventSelect+` WHERE i.status = 'recorded' AND i."when" >= $1 AND i."when" < $2
	 AND (cardinality($3::uuid[]) = 0 OR i.organization_id = ANY($3::uuid[])) ORDER BY i."when" DESC, i.id`, start, end, uuidArrayToStrings(orgIDs))
	if err != nil {
		return nil, fmt.Errorf("load quarterly events: %w", err)
	}
	items := make([]*entity.RiskEvent, 0)
	byID := make(map[uuid.UUID]*entity.RiskEvent)
	ids := make([]uuid.UUID, 0)
	for rows.Next() {
		event, err := scanRiskEvent(rows)
		if err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan quarterly event: %w", err)
		}
		event.LinkedRisks = []entity.IncidentRiskLink{}
		items = append(items, event)
		byID[event.ID] = event
		ids = append(ids, event.ID)
	}
	rowErr := rows.Err()
	rows.Close()
	if rowErr != nil {
		return nil, rowErr
	}
	if len(ids) == 0 {
		return items, nil
	}
	// Only relation presence is read across scopes. Related risk titles and
	// codes below remain constrained by the report's authorized organizations.
	presence, err := q.Query(ctx, `SELECT i.id, (i.linked_risk_id IS NOT NULL OR EXISTS (SELECT 1 FROM incident_risk_links l WHERE l.incident_id = i.id)) FROM incidents i WHERE i.id = ANY($1::uuid[])`, ids)
	if err != nil {
		return nil, err
	}
	for presence.Next() {
		var id uuid.UUID
		var linked bool
		if err := presence.Scan(&id, &linked); err != nil {
			presence.Close()
			return nil, err
		}
		byID[id].HasLinkedRisks = &linked
	}
	presenceErr := presence.Err()
	presence.Close()
	if presenceErr != nil {
		return nil, presenceErr
	}
	links, err := q.Query(ctx, `SELECT l.incident_id, r.id, COALESCE(r.code, ''), COALESCE(r.title, '')
	 FROM incident_risk_links l JOIN risks r ON r.id = l.risk_id
	 WHERE l.incident_id = ANY($1::uuid[]) AND (cardinality($2::uuid[]) = 0 OR r.organization_id = ANY($2::uuid[]))
	 ORDER BY l.created_at, r.id`, ids, uuidArrayToStrings(orgIDs))
	if err != nil {
		return nil, fmt.Errorf("load quarterly event links: %w", err)
	}
	defer links.Close()
	for links.Next() {
		var eventID uuid.UUID
		var link entity.IncidentRiskLink
		if err := links.Scan(&eventID, &link.ID, &link.Code, &link.Title); err != nil {
			return nil, err
		}
		byID[eventID].LinkedRisks = append(byID[eventID].LinkedRisks, link)
	}
	return items, links.Err()
}

func loadQuarterlyRisks(ctx context.Context, q riskQueryer, cycle string, start, end time.Time, orgIDs []uuid.UUID) ([]*entity.QuarterlyReportRisk, *time.Time, error) {
	query := quarterlyLifecycleCTE + `, risk_snapshots AS (
		SELECT DISTINCT ON (r.version_group_id) r.*
		FROM risks r
		WHERE r.status = 'final'
		  AND r.superseded_by_risk_id IS NULL
		  AND (COALESCE(r.assessment_cycle, '') <= $1)
		  AND (COALESCE(r.assessment_cycle, '') <> '' OR COALESCE(r.effective_from::timestamptz, r.created_at) < $3)
		ORDER BY r.version_group_id,
		         COALESCE(r.assessment_cycle, '') DESC,
		         r.version_number DESC,
		         r.created_at DESC,
		         r.id DESC
	)
	SELECT r.id, r.code, r.title, r.description, r.category, r.status, r.version_group_id, r.previous_risk_id, r.is_current, r.is_cycle_current, r.version_number, r.archived_at, r.archived_reason, r.organization_id, r.created_by, r.objective_id, r.ro_id, r.likelihood_assessment_id, r.impact_criteria_id, COALESCE(r.impact_justification, '') as impact_justification,
		        r.cause, r.risk_source, r.controllability, r.impact_description,
		        r.existing_control, r.control_effectiveness, r.probability, r.impact, r.weight, r.nilai, ROUND(COALESCE(r.nilai, 0))::int,
		        r.risk_priority, r.risk_appetite, r.treatment_option,
		        r.target_probability, r.target_impact, r.target_weight, r.target_nilai, ROUND(COALESCE(r.target_nilai, 0))::int, r.residual_acceptance_reason,
		        r.next_review_date::text, COALESCE(r.review_schedule_text, ''), COALESCE(r.assessment_cycle, ''), COALESCE(r.review_type, ''), COALESCE(r.change_reason, ''), COALESCE(r.review_summary, ''),
		        r.review_started_at, r.review_submitted_at, r.review_approved_at,
		        r.created_at, r.updated_at,
		        COALESCE(o.name, '') AS org_name,
		        COALESCE(u.name, '') AS created_by_name,
		        monitoring.assessment_cycle,
		        monitoring.mode,
		        monitoring.observed_probability,
		        monitoring.observed_impact,
		        monitoring.observed_weight,
		        monitoring.observed_nilai,
		        monitoring.observed_level, monitoring.finalized_at,
	        GREATEST(r.updated_at, monitoring.updated_at),
	        (COALESCE(lifecycle.archived_at >= $2 AND lifecycle.archived_at < $3, FALSE) OR EXISTS (SELECT 1 FROM lifecycle_events e WHERE e.version_group_id = r.version_group_id AND e.action = 'archive' AND e.created_at >= $2 AND e.created_at < $3))
	 FROM risk_snapshots r
	 LEFT JOIN lifecycle ON lifecycle.version_group_id = r.version_group_id
	 LEFT JOIN organizations o ON r.organization_id = o.id
	 LEFT JOIN users u ON r.created_by = u.id
	 LEFT JOIN LATERAL (
		 SELECT rm.assessment_cycle,
		        rm.mode,
		        rm.observed_probability,
		        rm.observed_impact,
		        rm.observed_weight,
		        rm.observed_nilai,
		        rm.observed_level, rm.finalized_at, rm.updated_at
		 FROM risk_monitorings rm
		 WHERE rm.version_group_id = r.version_group_id
		   AND rm.assessment_cycle = $1
		   AND rm.status = 'final'
		 ORDER BY rm.finalized_at DESC NULLS LAST, rm.updated_at DESC, rm.id DESC
		 LIMIT 1
	 ) monitoring ON TRUE
	 WHERE (
        EXISTS (SELECT 1 FROM lifecycle_events e WHERE e.version_group_id = r.version_group_id AND e.action = 'restore' AND e.created_at >= $2 AND e.created_at < $3)
        OR CASE
          WHEN EXISTS (SELECT 1 FROM lifecycle_events e WHERE e.version_group_id = r.version_group_id AND e.created_at < $2)
          THEN (SELECT e.action FROM lifecycle_events e WHERE e.version_group_id = r.version_group_id AND e.created_at < $2 ORDER BY e.created_at DESC, e.id DESC LIMIT 1) <> 'archive'
          ELSE lifecycle.archived_at IS NULL OR lifecycle.archived_at >= $2
        END
     )`
	args := []interface{}{cycle, start, end}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(orgIDs))
	}
	query += " ORDER BY COALESCE(o.name, ''), COALESCE(r.code, ''), r.title"

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, nil, fmt.Errorf("list cycle snapshot: %w", err)
	}
	defer rows.Close()

	risks := make([]*entity.QuarterlyReportRisk, 0)
	var dataUpdatedAt *time.Time
	riskByID := make(map[uuid.UUID]*entity.Risk)
	riskIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		risk := &entity.Risk{}
		var archivedInPeriod bool
		var sourceUpdatedAt time.Time
		var roID uuid.NullUUID
		if err := rows.Scan(
			&risk.ID, &risk.Code, &risk.Title, &risk.Description, &risk.Category, &risk.Status, &risk.VersionGroupID, &risk.PreviousRiskID, &risk.IsCurrent, &risk.IsCycleCurrent, &risk.VersionNumber, &risk.ArchivedAt, &risk.ArchivedReason, &risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &roID, &risk.LikelihoodAssessmentID, &risk.ImpactCriteriaID, &risk.ImpactJustification,
			&risk.Cause, &risk.RiskSource, &risk.Controllability, &risk.ImpactDesc,
			&risk.ExistingControl, &risk.ControlEffectiveness, &risk.Probability, &risk.Impact, &risk.Weight, &risk.Nilai, &risk.InherentScore,
			&risk.RiskPriority, &risk.RiskAppetite, &risk.TreatmentOption,
			&risk.TargetProbability, &risk.TargetImpact, &risk.TargetWeight, &risk.TargetNilai, &risk.TargetScore, &risk.ResidualAcceptanceReason,
			&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary, &risk.ReviewStartedAt, &risk.ReviewSubmittedAt, &risk.ReviewApprovedAt,
			&risk.CreatedAt, &risk.UpdatedAt,
			&risk.OrgName, &risk.CreatedByName,
			&risk.MonitoringAssessmentCycle, &risk.MonitoringMode,
			&risk.MonitoringObservedProbability, &risk.MonitoringObservedImpact,
			&risk.MonitoringObservedWeight, &risk.MonitoringObservedNilai,
			&risk.MonitoringObservedLevel, &risk.LastMonitoredAt, &sourceUpdatedAt, &archivedInPeriod,
		); err != nil {
			return nil, nil, fmt.Errorf("scan cycle snapshot risk: %w", err)
		}
		risk.ROID = nullableUUIDPtr(roID)
		if risk.MonitoringAssessmentCycle != nil {
			status := entity.RiskMonitoringStatusFinal
			risk.MonitoringStatus = &status
		}
		dataUpdatedAt = latestQuarterlyUpdate(dataUpdatedAt, sourceUpdatedAt)
		risks = append(risks, &entity.QuarterlyReportRisk{Risk: risk, ArchivedInPeriod: archivedInPeriod})
		riskByID[risk.ID] = risk
		riskIDs = append(riskIDs, risk.ID)
	}
	if rows.Err() != nil {
		return nil, nil, fmt.Errorf("iterate cycle snapshot risks: %w", rows.Err())
	}
	if len(riskIDs) == 0 {
		return risks, dataUpdatedAt, nil
	}

	mitigationRows, err := q.Query(ctx,
		`SELECT id, risk_id, action, owner, owner_user_id, due_date::text, frequency, recurring_interval, report_day, report_date, COALESCE(execution_schedule_text, ''), target_cost, sort_order, created_at,
		        mitigation_type, activity_stage, expected_output, quantitative_target, supporting_unit, resources_required, contingency_plan, potential_obstacle, is_breakthrough_activity, is_existing_control
		 FROM mitigations
		 WHERE risk_id = ANY($1)
		 ORDER BY risk_id, sort_order, created_at`, riskIDs)
	if err != nil {
		return nil, nil, fmt.Errorf("load cycle snapshot mitigations: %w", err)
	}
	defer mitigationRows.Close()

	for mitigationRows.Next() {
		var mitigation entity.Mitigation
		if err := mitigationRows.Scan(&mitigation.ID, &mitigation.RiskID, &mitigation.Action, &mitigation.Owner, &mitigation.OwnerUserID, &mitigation.DueDate, &mitigation.Frequency, &mitigation.RecurringInterval, &mitigation.ReportDay, &mitigation.ReportDate, &mitigation.ExecutionScheduleText, &mitigation.TargetCost, &mitigation.SortOrder, &mitigation.CreatedAt,
			&mitigation.MitigationType, &mitigation.ActivityStage, &mitigation.ExpectedOutput, &mitigation.QuantitativeTarget, &mitigation.SupportingUnit, &mitigation.ResourcesRequired, &mitigation.ContingencyPlan, &mitigation.PotentialObstacle, &mitigation.IsBreakthroughActivity, &mitigation.IsExistingControl); err != nil {
			return nil, nil, fmt.Errorf("scan cycle snapshot mitigation: %w", err)
		}
		if risk := riskByID[mitigation.RiskID]; risk != nil {
			risk.Mitigations = append(risk.Mitigations, mitigation)
		}
	}
	if mitigationRows.Err() != nil {
		return nil, nil, fmt.Errorf("iterate cycle snapshot mitigations: %w", mitigationRows.Err())
	}

	return risks, dataUpdatedAt, nil
}
