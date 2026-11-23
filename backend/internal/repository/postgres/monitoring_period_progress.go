package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
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
	ScopeProfileID              *uuid.UUID                     `json:"scopeProfileId,omitempty"`
	ScopeLocked                 bool                           `json:"scopeLocked,omitempty"`
	NeedsReview                 bool                           `json:"needsReview,omitempty"`
	BlocksRevision              bool                           `json:"blocksRevision,omitempty"`
	CanCloseAdministratively    bool                           `json:"canCloseAdministratively,omitempty"`
	AdministrativeClosureReason string                         `json:"administrativeClosureReason,omitempty"`
	CalendarEndsOn              string                         `json:"calendarEndsOn,omitempty"`
	WorkingPaper                MonitoringActivityProgress     `json:"workingPaper"`
	Evaluation                  MonitoringActivityProgress     `json:"evaluation"`
	Monitorings                 []RiskMonitoringPeriodProgress `json:"monitorings"`
}
type LinkedProfileDocument struct {
	ID                uuid.UUID `json:"id"`
	Kind              string    `json:"kind"`
	Complete          bool      `json:"complete"`
	ObservationCutoff string    `json:"observationCutoff,omitempty"`
}

type ProfilePeriodProgress struct {
	Year            int                        `json:"year"`
	Version         int                        `json:"version"`
	Rule            *entity.MonitoringRule     `json:"rule"`
	Periods         []MonitoringPeriodProgress `json:"periods"`
	LinkedDocuments []LinkedProfileDocument    `json:"linkedDocuments,omitempty"`
}

func (s *UPRWorkflow) AnnualProfilePeriodProgress(ctx context.Context, scope *entity.AccessScope, profile uuid.UUID) (ProfilePeriodProgress, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return ProfilePeriodProgress{}, fmt.Errorf("begin profile period progress snapshot: %w", err)
	}
	defer tx.Rollback(ctx)
	progress, err := annualProfilePeriodProgressForScope(ctx, tx, scope, profile)
	if err != nil {
		return ProfilePeriodProgress{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ProfilePeriodProgress{}, fmt.Errorf("commit profile period progress snapshot: %w", err)
	}
	return progress, nil
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

func (s *UPRWorkflow) ApproveAnnualMonitoringPeriodClosure(ctx context.Context, scope *entity.AccessScope, profile, period uuid.UUID, reason string) error {
	if scope == nil || scope.UserID == uuid.Nil || entity.NormalizeRole(scope.Role) != entity.RoleSuperAdmin {
		return domainerrors.ErrForbidden
	}
	reason = strings.TrimSpace(reason)
	if n := len([]rune(reason)); n == 0 || n > 2000 {
		return UPRWorkflowError("Isi alasan penutupan administratif (maksimal 2.000 karakter).")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	org, err := annualProfileReadOrganization(ctx, tx, scope, profile)
	if err != nil {
		return err
	}
	if err := lockUPROrganization(ctx, tx, org); err != nil {
		return err
	}
	var closed, blocked, approved bool
	err = tx.QueryRow(ctx, `SELECT window_closed, blocks_revision, approved_at IS NOT NULL
		FROM annual_monitoring_revision_periods($1) WHERE period_id=$2`, profile, period).Scan(&closed, &blocked, &approved)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrUPRNotFound
	}
	if err != nil {
		return err
	}
	if approved {
		return nil
	}
	if !closed || !blocked {
		return UPRWorkflowError("Penutupan administratif hanya tersedia setelah jendela tutup dan proses pemantauan belum selesai.")
	}
	_, err = tx.Exec(ctx, `UPDATE annual_monitoring_period_completion
		SET approved_at=clock_timestamp(), approved_by=$3, approval_reason=$4
		WHERE organization_id=$1 AND monitoring_period_id=$2`, org, period, scope.UserID, reason)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// Configured monitoring is unique per organization/year, period and risk
// group. Bound reads cap documents at the period's selected profile version.
const configuredPeriodContext = `WITH period_profile AS (
 SELECT p.organization_id,p.year,p.version
 FROM annual_risk_profile_versions p
 WHERE p.id=annual_monitoring_period_profile($1,$2)
)`

const configuredProgressPapers = configuredPeriodContext + `
 SELECT wp.id,wp.status,wp.tte_skipped,
        (SELECT count(*) FROM working_paper_signatories WHERE working_paper_id=wp.id AND status='signed'),
        (SELECT count(*) FROM working_paper_signatories WHERE working_paper_id=wp.id)
 FROM working_papers wp JOIN annual_risk_profile_versions source ON source.id=wp.profile_version_id
 JOIN period_profile p ON source.organization_id=p.organization_id AND source.year=p.year AND source.version<=p.version
 WHERE wp.monitoring_period_id=$2 AND wp.status<>'cancelled'`

const configuredProgressEvaluations = configuredPeriodContext + `
 SELECT e.id,e.status,
        (SELECT count(*) FROM evaluation_sections s JOIN evaluation_items i ON i.section_id=s.id
         WHERE s.evaluation_id=e.id AND i.answer IN ('yes','no')),
        (SELECT count(*) FROM evaluation_sections s JOIN evaluation_items i ON i.section_id=s.id WHERE s.evaluation_id=e.id)
 FROM evaluations e JOIN annual_risk_profile_versions source ON source.id=e.profile_version_id
 JOIN period_profile p ON source.organization_id=p.organization_id AND source.year=p.year AND source.version<=p.version
 WHERE e.monitoring_period_id=$2`

const configuredProgressMonitorings = configuredPeriodContext + `,
 scope AS (
  SELECT version_group_id FROM annual_monitoring_period_scope($1,$2)
 ), groups AS (
  SELECT version_group_id FROM scope
  UNION
  SELECT version_group_id FROM annual_risk_profile_members WHERE profile_version_id=$1
 ), monitorings AS (
  SELECT rm.*
  FROM risk_monitorings rm JOIN annual_risk_profile_versions source ON source.id=rm.profile_version_id
  JOIN period_profile p ON source.organization_id=p.organization_id AND source.year=p.year AND source.version<=p.version
  WHERE rm.monitoring_period_id=$2 AND rm.transaction_kind='monitoring'
    AND rm.status IN ('draft','final') AND rm.superseded_by_monitoring_id IS NULL
 )
 SELECT scope.version_group_id IS NOT NULL,groups.version_group_id,rm.id,COALESCE(rm.status,''),
        CASE WHEN rm.id IS NULL THEN 0 ELSE monitoring_observation_in_period($1,$2,rm.observed_at)::int +
          CASE WHEN COALESCE((rm.draft_payload->>'observedScoreConfirmed')::boolean,false)
            AND rm.observed_probability BETWEEN 1 AND 5 AND rm.observed_impact BETWEEN 1 AND 5 THEN 1 ELSE 0 END
        END
 FROM groups LEFT JOIN scope USING(version_group_id)
 LEFT JOIN monitorings rm ON rm.version_group_id=scope.version_group_id
 ORDER BY groups.version_group_id`

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
		if err := db.QueryRow(ctx, `
			SELECT COALESCE(jsonb_agg(
				jsonb_strip_nulls(jsonb_build_object('id', id, 'kind', kind, 'complete', complete, 'observationCutoff', cutoff))
				ORDER BY kind DESC, cutoff DESC NULLS LAST, id
			), '[]'::jsonb)
			FROM (
				SELECT id, 'workingPaper' AS kind, status = 'completed' AS complete, observation_cutoff AS cutoff
				FROM working_papers
				WHERE profile_version_id = $1 AND org_id = $2 AND monitoring_period_id IS NULL AND status <> 'cancelled'
				UNION ALL
				SELECT id, 'evaluation', status = 'final', NULL::date
				FROM evaluations
				WHERE profile_version_id = $1 AND organization_id = $2 AND monitoring_period_id IS NULL
			) AS documents
		`, profile, org).Scan(&out.LinkedDocuments); err != nil {
			return out, fmt.Errorf("read linked profile documents: %w", err)
		}
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
	revisionRows, err := db.Query(ctx, `WITH latest_final AS (
		SELECT latest.id FROM annual_risk_profile_versions selected
		JOIN annual_risk_profile_versions latest
			ON latest.organization_id=selected.organization_id AND latest.year=selected.year
		WHERE selected.id=$1 AND latest.finalized_at IS NOT NULL
		ORDER BY latest.version DESC LIMIT 1
	)
	SELECT period_id, blocks_revision,
		window_closed AND blocks_revision, COALESCE(approval_reason,'')
		FROM latest_final CROSS JOIN LATERAL annual_monitoring_revision_periods(latest_final.id)`, profile)
	if err != nil {
		return out, fmt.Errorf("read period completion: %w", err)
	}
	revisionPeriods, err := pgx.CollectRows(revisionRows, func(row pgx.CollectableRow) (MonitoringPeriodProgress, error) {
		var item MonitoringPeriodProgress
		err := row.Scan(&item.ID, &item.BlocksRevision, &item.CanCloseAdministratively, &item.AdministrativeClosureReason)
		return item, err
	})
	if err != nil {
		return out, fmt.Errorf("read period completion: %w", err)
	}
	completionByID := make(map[uuid.UUID]MonitoringPeriodProgress, len(revisionPeriods))
	for _, item := range revisionPeriods {
		completionByID[item.ID] = item
	}
	for _, period := range rule.Periods {
		item := completionByID[period.ID]
		item.MonitoringRulePeriod = period
		item.WorkingPaper = MonitoringActivityProgress{Status: "pending"}
		item.Evaluation = MonitoringActivityProgress{Status: "pending"}
		item.Monitorings = []RiskMonitoringPeriodProgress{}
		_, calendarEnd, err := entity.MonitoringPeriodCalendarBounds(rule.Year, rule.Frequency, period.Ordinal)
		if err != nil {
			return out, fmt.Errorf("resolve monitoring period calendar: %w", err)
		}
		item.CalendarEndsOn = calendarEnd.Format("2006-01-02")
		if err := db.QueryRow(ctx, `
			SELECT annual_monitoring_period_profile($1,$2),frozen.locked_at IS NOT NULL,COALESCE(frozen.needs_review,false)
			FROM (VALUES (1)) AS period
			LEFT JOIN LATERAL annual_monitoring_period_freeze($1,$2) frozen ON true
		`, profile, period.ID).Scan(&item.ScopeProfileID, &item.ScopeLocked, &item.NeedsReview); err != nil {
			return out, fmt.Errorf("read monitoring period profile: %w", err)
		}
		var status string
		var skipped bool
		var id uuid.UUID
		err = db.QueryRow(ctx, configuredProgressPapers, profile, period.ID).Scan(&id, &status, &skipped, &item.WorkingPaper.Completed, &item.WorkingPaper.Total)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return out, err
		}
		if err == nil {
			item.WorkingPaper.ID = &id
			if skipped {
				item.WorkingPaper.Note = "TTE dilewati"
			}
			item.WorkingPaper.Status = "ongoing"
			if status == entity.WorkingPaperStatusCompleted {
				item.WorkingPaper.Status = "done"
			}
		}
		var evalID uuid.UUID
		err = db.QueryRow(ctx, configuredProgressEvaluations, profile, period.ID).Scan(&evalID, &status, &item.Evaluation.Completed, &item.Evaluation.Total)
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

		rows, err := db.Query(ctx, configuredProgressMonitorings, profile, period.ID)
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
