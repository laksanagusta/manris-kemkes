package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
)

type MonitoringRuleProgressOption struct {
	ID            uuid.UUID                            `json:"id"`
	Name          string                               `json:"name"`
	Year          int                                  `json:"year"`
	Organizations []entity.QuarterlyReportOrganization `json:"organizations"`
}

func (s *UPRWorkflow) MonitoringRuleProgressOptions(ctx context.Context, scope *entity.AccessScope) ([]MonitoringRuleProgressOption, error) {
	return readMonitoringRuleProgressOptions(ctx, s.pool, scope)
}

func readMonitoringRuleProgressOptions(ctx context.Context, db riskQueryer, scope *entity.AccessScope) ([]MonitoringRuleProgressOption, error) {
	if scope == nil {
		return nil, ErrUPRNotFound
	}
	rows, err := db.Query(ctx, `SELECT r.id, r.name, r.year,
		jsonb_agg(jsonb_build_object('id',o.id,'name',o.name) ORDER BY o.name,o.id)
		FROM monitoring_rules r JOIN (
			SELECT DISTINCT monitoring_rule_id,year,organization_id FROM annual_risk_profile_versions
			WHERE finalized_at IS NOT NULL AND ($1 OR organization_id=ANY($2::uuid[]))
		) p ON p.monitoring_rule_id=r.id AND p.year=r.year
		JOIN organizations o ON o.id=p.organization_id
		GROUP BY r.id, r.name, r.year
		ORDER BY r.year DESC, r.name, r.id`, scope.IsGlobal, uuidArrayToStrings(scope.AccessibleOrgIDs))
	if err != nil {
		return nil, fmt.Errorf("query monitoring rules for progress: %w", err)
	}
	options, err := pgx.CollectRows(rows, pgx.RowToStructByPos[MonitoringRuleProgressOption])
	if err != nil {
		return nil, fmt.Errorf("read monitoring rules for progress: %w", err)
	}
	return options, nil
}

func (s *UPRWorkflow) MonitoringRuleProgressReport(ctx context.Context, scope *entity.AccessScope, ruleID uuid.UUID, unitIDs []uuid.UUID, includeExport bool) (AnnualProfileProgressReport, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return AnnualProfileProgressReport{}, fmt.Errorf("begin monitoring rule report: %w", err)
	}
	defer tx.Rollback(ctx)

	out, err := readMonitoringRuleProgressReport(ctx, tx, scope, ruleID, unitIDs, includeExport, timeutil.BusinessNow())
	if err != nil {
		return out, err
	}
	if err := tx.Commit(ctx); err != nil {
		return out, fmt.Errorf("commit monitoring rule report: %w", err)
	}
	return out, nil
}

func readMonitoringRuleProgressReport(ctx context.Context, db riskQueryer, scope *entity.AccessScope, ruleID uuid.UUID, unitIDs []uuid.UUID, includeExport bool, now time.Time) (AnnualProfileProgressReport, error) {
	var out AnnualProfileProgressReport
	if scope == nil {
		return out, ErrUPRNotFound
	}
	var year int
	var frequency string
	err := db.QueryRow(ctx, `SELECT year, frequency FROM monitoring_rules WHERE id=$1`, ruleID).Scan(&year, &frequency)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrUPRNotFound
	}
	if err != nil {
		return out, fmt.Errorf("read monitoring rule for progress: %w", err)
	}
	rows, err := db.Query(ctx, `SELECT DISTINCT ON (organization_id) id, organization_id
		FROM annual_risk_profile_versions
		WHERE monitoring_rule_id=$1 AND year=$2 AND finalized_at IS NOT NULL
		  AND ($3 OR organization_id=ANY($4::uuid[]))
		ORDER BY organization_id, version DESC, id`, ruleID, year, scope.IsGlobal, uuidArrayToStrings(scope.AccessibleOrgIDs))
	if err != nil {
		return out, fmt.Errorf("query final profiles for monitoring rule: %w", err)
	}
	type unitProfile struct{ profileID, orgID uuid.UUID }
	profiles, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (unitProfile, error) {
		var profile unitProfile
		err := row.Scan(&profile.profileID, &profile.orgID)
		return profile, err
	})
	if err != nil {
		return out, fmt.Errorf("read final profiles for monitoring rule: %w", err)
	}
	if len(profiles) == 0 {
		return out, ErrUPRNotFound
	}
	selected := make(map[uuid.UUID]struct{}, len(unitIDs))
	for _, unitID := range unitIDs {
		selected[unitID] = struct{}{}
	}
	var profileIDs, orgIDs []uuid.UUID
	for _, profile := range profiles {
		if _, included := selected[profile.orgID]; len(selected) == 0 || included {
			profileIDs, orgIDs = append(profileIDs, profile.profileID), append(orgIDs, profile.orgID)
		}
	}
	if len(selected) > 0 && len(selected) != len(orgIDs) {
		return out, UPRWorkflowError("Sebagian unit pilihan tidak tersedia untuk rules ini.")
	}
	return readAnnualProgressForProfiles(ctx, db, year, &ruleID, frequency, profileIDs, orgIDs, nil, includeExport, now)
}
