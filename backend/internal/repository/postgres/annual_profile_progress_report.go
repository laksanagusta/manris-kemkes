package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/timeutil"
)

type AnnualProgressRisk struct {
	GroupID uuid.UUID `json:"groupId"`
	Score   *float64  `json:"score"`
	Weight  *float64  `json:"weight"`
	Target  *float64  `json:"target"`
}

type AnnualProgressPeriod struct {
	ID            uuid.UUID            `json:"id"`
	Label         string               `json:"label"`
	Risks         []AnnualProgressRisk `json:"risks"`
	TotalRisks    int                  `json:"totalRisks"`
	ReportedTasks int                  `json:"reportedTasks"`
	TotalTasks    int                  `json:"totalTasks"`
}

type AnnualProfileProgressReport struct {
	Organizations []entity.QuarterlyReportOrganization `json:"organizations"`
	Baseline      []AnnualProgressRisk                 `json:"baseline"`
	Periods       []AnnualProgressPeriod               `json:"periods"`
	Latest        *entity.QuarterlyReportData          `json:"latest,omitempty"`
}

func (s *UPRWorkflow) AnnualProfileProgressReport(ctx context.Context, scope *entity.AccessScope, id uuid.UUID, includeExport bool) (AnnualProfileProgressReport, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return AnnualProfileProgressReport{}, fmt.Errorf("begin annual profile report: %w", err)
	}
	defer tx.Rollback(ctx)

	out, err := readAnnualProfileProgressReport(ctx, tx, scope, id, includeExport, timeutil.BusinessNow())
	if err != nil {
		return out, err
	}
	if err := tx.Commit(ctx); err != nil {
		return out, fmt.Errorf("commit annual profile report: %w", err)
	}
	return out, nil
}

func readAnnualProfileProgressReport(ctx context.Context, db riskQueryer, scope *entity.AccessScope, id uuid.UUID, includeExport bool, now time.Time) (AnnualProfileProgressReport, error) {
	var out AnnualProfileProgressReport
	org, err := annualProfileReadOrganization(ctx, db, scope, id)
	if err != nil {
		return out, err
	}

	var year int
	var ruleID *uuid.UUID
	var frequency string
	err = db.QueryRow(ctx, `SELECT p.year,p.monitoring_rule_id,COALESCE(rule.frequency,'')
		FROM annual_risk_profile_versions p LEFT JOIN monitoring_rules rule ON rule.id=p.monitoring_rule_id
		WHERE p.id=$1 AND p.finalized_at IS NOT NULL`, id).Scan(&year, &ruleID, &frequency)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrUPRNotFound
	}
	if err != nil {
		return out, fmt.Errorf("read finalized annual profile: %w", err)
	}

	return readAnnualProgressForProfiles(ctx, db, year, ruleID, frequency, []uuid.UUID{id}, []uuid.UUID{org}, &id, includeExport, now)
}

func readAnnualProgressForProfiles(ctx context.Context, db riskQueryer, year int, ruleID *uuid.UUID, frequency string, profileIDs, orgIDs []uuid.UUID, exactProfileID *uuid.UUID, includeExport bool, now time.Time) (AnnualProfileProgressReport, error) {
	out := AnnualProfileProgressReport{
		Organizations: []entity.QuarterlyReportOrganization{},
		Baseline:      []AnnualProgressRisk{}, Periods: []AnnualProgressPeriod{},
	}
	// The shared quarterly loaders treat an empty organization list as global.
	if len(orgIDs) == 0 {
		return out, nil
	}

	var err error
	out.Organizations, err = listQuarterlyOrganizations(ctx, db, orgIDs)
	if err != nil {
		return out, err
	}

	rows, err := db.Query(ctx, `SELECT m.version_group_id,
		COALESCE((m.baseline->>'value')::float8,(m.baseline->>'nilai')::float8,(m.baseline->>'score')::float8),
		(m.baseline->>'weight')::float8,
		COALESCE((m.baseline->>'target_nilai')::float8,(m.baseline->>'targetScore')::float8)
		FROM annual_risk_profile_members m WHERE m.profile_version_id=ANY($1::uuid[])
		AND NOT EXISTS (SELECT 1 FROM annual_risk_profile_exclusions x
			WHERE x.profile_version_id=m.profile_version_id AND x.version_group_id=m.version_group_id)
		ORDER BY m.version_group_id`, uuidArrayToStrings(profileIDs))
	if err != nil {
		return out, fmt.Errorf("query frozen annual baseline: %w", err)
	}
	out.Baseline, err = pgx.CollectRows(rows, pgx.RowToStructByPos[AnnualProgressRisk])
	if err != nil {
		return out, fmt.Errorf("read frozen annual baseline: %w", err)
	}
	if ruleID == nil {
		return out, nil
	}

	periods, err := readRulePeriods(ctx, db, *ruleID)
	if err != nil {
		return out, fmt.Errorf("read annual report calendar: %w", err)
	}
	var previous, latest *entity.QuarterlyReportData
	var lastActive int
	for _, period := range periods {
		start, end, err := entity.MonitoringPeriodCalendarBounds(year, frequency, period.Ordinal)
		if err != nil {
			return out, fmt.Errorf("resolve annual report period %s: %w", period.ID, err)
		}
		if now.Before(start) {
			break
		}
		end = end.AddDate(0, 0, 1)
		cycle := fmt.Sprintf("%d · %s", year, period.Label)
		filter := repository.QuarterlyReportPeriod{
			ProfileYear: year, RuleID: ruleID, MonitoringPeriodID: &period.ID,
			AnnualProfileVersionID: exactProfileID,
		}
		risks, updatedAt, err := loadQuarterlyRisks(ctx, db, cycle, start, end, orgIDs, filter)
		if err != nil {
			return out, err
		}
		tasks, err := loadQuarterlyTasks(ctx, db, cycle, start, end, orgIDs, filter)
		if err != nil {
			return out, err
		}
		point := AnnualProgressPeriod{
			ID: period.ID, Label: period.Label, Risks: []AnnualProgressRisk{},
			TotalRisks: len(risks), TotalTasks: len(tasks),
		}
		for _, task := range tasks {
			if task.HasValidReport() {
				point.ReportedTasks++
			}
		}
		for _, risk := range risks {
			if risk.MonitoringStatus == nil {
				continue
			}
			target := risk.TargetNilai
			point.Risks = append(point.Risks, AnnualProgressRisk{
				GroupID: risk.VersionGroupID, Score: risk.MonitoringObservedNilai,
				Weight: risk.MonitoringObservedWeight, Target: &target,
			})
		}
		out.Periods = append(out.Periods, point)
		if includeExport {
			current := &entity.QuarterlyReportData{
				PeriodStart: &start, PeriodEnd: &end, Cycle: cycle, GeneratedAt: now,
				Risks: risks, Tasks: tasks, DataUpdatedAt: updatedAt, Warnings: []string{}, ComparisonCycle: cycle,
				PreviousRisks: []*entity.QuarterlyReportRisk{}, PreviousTasks: []*entity.QuarterlyReportTask{},
			}
			if previous != nil {
				current.ComparisonCycle, current.PreviousRisks, current.PreviousTasks = previous.Cycle, previous.Risks, previous.Tasks
			}
			previous = current
		}
		if len(point.Risks) > 0 || point.ReportedTasks > 0 {
			lastActive = len(out.Periods)
			latest = previous
		}
	}
	out.Periods = out.Periods[:lastActive]
	if latest == nil {
		return out, nil
	}
	latest.Organizations = out.Organizations
	latest.Events, err = loadQuarterlyEvents(ctx, db, *latest.PeriodStart, *latest.PeriodEnd, orgIDs)
	if err != nil {
		return out, err
	}
	out.Latest = latest
	return out, nil
}
