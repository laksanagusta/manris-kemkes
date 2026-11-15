package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
)

type MonitoringActivityProgress struct {
	Status    string     `json:"status"`
	Completed int        `json:"completed"`
	Total     int        `json:"total"`
	ID        *uuid.UUID `json:"id,omitempty"`
	Note      string     `json:"note,omitempty"`
}
type RiskMonitoringPeriodProgress struct {
	MonitoringActivityProgress
	GroupID    uuid.UUID `json:"groupId"`
	Applicable bool      `json:"applicable"`
}
type MonitoringPeriodProgress struct {
	entity.MonitoringRulePeriod
	WorkingPaper MonitoringActivityProgress     `json:"workingPaper"`
	Evaluation   MonitoringActivityProgress     `json:"evaluation"`
	Monitorings  []RiskMonitoringPeriodProgress `json:"monitorings"`
}
type ProfilePeriodProgress struct {
	Year    int                        `json:"year"`
	Version int                        `json:"version"`
	Rule    *entity.MonitoringRule     `json:"rule"`
	Periods []MonitoringPeriodProgress `json:"periods"`
}

func (s *UPRWorkflow) AnnualProfilePeriodProgress(ctx context.Context, scope *entity.AccessScope, profile uuid.UUID) (ProfilePeriodProgress, error) {
	return annualProfilePeriodProgressForScope(ctx, s.pool, scope, profile)
}

func annualProfilePeriodProgressForScope(ctx context.Context, db riskQueryer, scope *entity.AccessScope, profile uuid.UUID) (ProfilePeriodProgress, error) {
	org, err := annualProfileReadOrganization(ctx, db, scope, profile)
	if err != nil {
		return ProfilePeriodProgress{}, err
	}
	return annualProfilePeriodProgress(ctx, db, org, profile)
}

func annualProfileReadOrganization(ctx context.Context, db riskQueryer, scope *entity.AccessScope, profile uuid.UUID) (uuid.UUID, error) {
	if scope == nil {
		return uuid.Nil, ErrUPRNotFound
	}
	var org uuid.UUID
	if err := db.QueryRow(ctx, `SELECT organization_id FROM annual_risk_profile_versions WHERE id=$1`, profile).Scan(&org); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrUPRNotFound
		}
		return uuid.Nil, err
	}
	if !scope.CanRead(org) {
		return uuid.Nil, ErrUPRNotFound
	}
	return org, nil
}

func annualProfilePeriodProgress(ctx context.Context, db riskQueryer, org, profile uuid.UUID) (ProfilePeriodProgress, error) {
	out := ProfilePeriodProgress{Periods: []MonitoringPeriodProgress{}}
	var ruleID *uuid.UUID
	if err := db.QueryRow(ctx, `SELECT monitoring_rule_id,year,version FROM annual_risk_profile_versions WHERE id=$1 AND organization_id=$2`, profile, org).Scan(&ruleID, &out.Year, &out.Version); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return out, ErrUPRNotFound
		}
		return out, err
	}
	if ruleID == nil {
		return out, nil
	}
	rule := &entity.MonitoringRule{ID: *ruleID}
	if err := db.QueryRow(ctx, `SELECT name,year,frequency,active FROM monitoring_rules WHERE id=$1`, ruleID).Scan(&rule.Name, &rule.Year, &rule.Frequency, &rule.Active); err != nil {
		return out, err
	}
	var err error
	rule.Periods, err = readRulePeriods(ctx, db, *ruleID)
	if err != nil {
		return out, err
	}
	out.Rule = rule
	for _, period := range rule.Periods {
		item := MonitoringPeriodProgress{MonitoringRulePeriod: period, WorkingPaper: MonitoringActivityProgress{Status: "pending"}, Evaluation: MonitoringActivityProgress{Status: "pending"}, Monitorings: []RiskMonitoringPeriodProgress{}}
		var status string
		var skipped bool
		var id uuid.UUID
		err = db.QueryRow(ctx, `SELECT wp.id,wp.status,wp.tte_skipped,(SELECT count(*) FROM working_paper_signatories WHERE working_paper_id=wp.id AND status='signed'),(SELECT count(*) FROM working_paper_signatories WHERE working_paper_id=wp.id) FROM working_papers wp WHERE wp.profile_version_id IN (SELECT p.id FROM annual_risk_profile_versions p JOIN annual_risk_profile_versions selected ON selected.organization_id=p.organization_id AND selected.year=p.year WHERE selected.id=$1) AND wp.monitoring_period_id=$2 AND wp.status<>'cancelled'`, profile, period.ID).Scan(&id, &status, &skipped, &item.WorkingPaper.Completed, &item.WorkingPaper.Total)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return out, err
		}
		if err == nil {
			item.WorkingPaper.ID = &id
			if skipped {
				item.WorkingPaper.Note = "TTE dilewati"
			}
			item.WorkingPaper.Status = "ongoing"
			if status == entity.WorkingPaperStatusCompleted && item.WorkingPaper.Total > 0 {
				item.WorkingPaper.Status = "done"
			}
		}
		var evalID uuid.UUID
		err = db.QueryRow(ctx, `SELECT e.id,e.status,(SELECT count(*) FROM evaluation_sections s JOIN evaluation_items i ON i.section_id=s.id WHERE s.evaluation_id=e.id AND i.answer IN ('yes','no')),(SELECT count(*) FROM evaluation_sections s JOIN evaluation_items i ON i.section_id=s.id WHERE s.evaluation_id=e.id) FROM evaluations e WHERE e.profile_version_id IN (SELECT p.id FROM annual_risk_profile_versions p JOIN annual_risk_profile_versions selected ON selected.organization_id=p.organization_id AND selected.year=p.year WHERE selected.id=$1) AND e.monitoring_period_id=$2`, profile, period.ID).Scan(&evalID, &status, &item.Evaluation.Completed, &item.Evaluation.Total)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return out, err
		}
		if err == nil {
			item.Evaluation.ID = &evalID
			item.Evaluation.Status = "ongoing"
			if status == "final" && item.Evaluation.Total > 0 && item.Evaluation.Completed == item.Evaluation.Total {
				item.Evaluation.Status = "done"
			}
		}
		_, calendarEnd, _ := entity.MonitoringPeriodCalendarBounds(rule.Year, rule.Frequency, period.Ordinal)
		rows, err := db.Query(ctx, `SELECT m.effective_from<=$3::date,m.version_group_id,rm.id,COALESCE(rm.status,''),CASE WHEN rm.id IS NULL THEN 0 ELSE monitoring_observation_in_period($1,$2,rm.observed_at)::int + CASE WHEN COALESCE((rm.draft_payload->>'observedScoreConfirmed')::boolean,false) AND rm.observed_probability BETWEEN 1 AND 5 AND rm.observed_impact BETWEEN 1 AND 5 THEN 1 ELSE 0 END END FROM annual_risk_profile_members m LEFT JOIN risk_monitorings rm ON rm.version_group_id=m.version_group_id AND rm.profile_version_id IN (SELECT p.id FROM annual_risk_profile_versions p JOIN annual_risk_profile_versions selected ON selected.organization_id=p.organization_id AND selected.year=p.year WHERE selected.id=$1) AND rm.monitoring_period_id=$2 WHERE m.profile_version_id=$1 ORDER BY m.version_group_id`, profile, period.ID, calendarEnd.Format("2006-01-02"))
		if err != nil {
			return out, err
		}
		list, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (RiskMonitoringPeriodProgress, error) {
			m := RiskMonitoringPeriodProgress{MonitoringActivityProgress: MonitoringActivityProgress{Status: "pending", Total: 2}}
			var state string
			err := row.Scan(&m.Applicable, &m.GroupID, &m.ID, &state, &m.Completed)
			if m.ID != nil {
				m.Status = "ongoing"
				if state == "final" && m.Completed == m.Total {
					m.Status = "done"
				}
			}
			return m, err
		})
		if err != nil {
			return out, err
		}
		item.Monitorings = list
		out.Periods = append(out.Periods, item)
	}
	return out, nil
}
