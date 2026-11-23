package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

func (r *unitProgressRepository) ListUnitProgressProfiles(ctx context.Context, _ []uuid.UUID) ([]entity.UnitProgressProfile, error) {
	// Rules are shared configuration. Unit authorization is applied to report rows,
	// so a rule remains selectable even before a unit finalizes its annual profile.
	return listUnitProgressRuleProfiles(ctx, r.pool)
}

func listUnitProgressRuleProfiles(ctx context.Context, db riskQueryer) ([]entity.UnitProgressProfile, error) {
	rows, err := db.Query(ctx, `SELECT year,id,name,frequency FROM monitoring_rules ORDER BY year DESC,name,id`)
	if err != nil {
		return nil, fmt.Errorf("list report rule profiles: %w", err)
	}
	profiles := []entity.UnitProgressProfile{}
	for rows.Next() {
		var p entity.UnitProgressProfile
		var name string
		if err := rows.Scan(&p.Year, &p.RuleID, &name, &p.Frequency); err != nil {
			rows.Close()
			return nil, err
		}
		p.ID = p.RuleID.String()
		p.Label = name
		profiles = append(profiles, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	for i := range profiles {
		periods, err := readRulePeriods(ctx, db, *profiles[i].RuleID)
		if err != nil {
			return nil, err
		}
		profiles[i].Periods = periods
	}
	return profiles, nil
}

func loadProfileUnitProgressRisks(ctx context.Context, q riskQueryer, period repository.QuarterlyReportPeriod, orgIDs []uuid.UUID) ([]entity.UnitProgressRisk, error) {
	rows, err := q.Query(ctx, `WITH profiles AS (
 SELECT DISTINCT ON (organization_id) id,organization_id
 FROM annual_risk_profile_versions
 WHERE year=$1 AND monitoring_rule_id IS NOT DISTINCT FROM $2::uuid AND finalized_at IS NOT NULL
 AND (cardinality($3::uuid[])=0 OR organization_id=ANY($3::uuid[]))
 ORDER BY organization_id,version DESC
 ), members AS (
 SELECT member.version_group_id,member.risk_id,member.baseline,member.effective_from,p.organization_id,NULL::int AS version_cap
 FROM profiles p CROSS JOIN LATERAL annual_monitoring_members_as_of(p.id,$6::date-1) member
 WHERE $4::uuid IS NULL
 UNION ALL
 SELECT member.version_group_id,member.risk_id,member.baseline,member.effective_from,p.organization_id,cap.version
 FROM profiles p
 CROSS JOIN LATERAL annual_monitoring_period_scope(p.id,$4) member
 JOIN annual_risk_profile_versions cap ON cap.id=annual_monitoring_period_profile(p.id,$4)
 )
 SELECT r.id,r.organization_id,COALESCE(member.baseline->>'code',r.code,''),
        COALESCE(member.baseline->>'title',r.title),r.status,r.updated_at,rm.id,COALESCE(rm.status,''),false
 FROM members member
 JOIN risks r ON r.id=member.risk_id AND r.organization_id=member.organization_id
 LEFT JOIN LATERAL (
 SELECT m.id,m.status FROM risk_monitorings m LEFT JOIN annual_risk_profile_versions v ON v.id=m.profile_version_id
 WHERE m.version_group_id=member.version_group_id
 AND ((v.organization_id=r.organization_id AND v.year=$1 AND v.monitoring_rule_id IS NOT DISTINCT FROM $2::uuid
       AND (member.version_cap IS NULL OR v.version<=member.version_cap)) OR ($2::uuid IS NULL AND m.profile_version_id IS NULL))
 AND (($4::uuid IS NULL AND m.assessment_cycle=$5) OR m.monitoring_period_id=$4)
 AND m.transaction_kind='monitoring' AND m.status IN ('draft','final') AND m.superseded_by_monitoring_id IS NULL
 ORDER BY (m.status='final') DESC,m.observed_at DESC,m.id DESC LIMIT 1
 ) rm ON TRUE
 WHERE member.effective_from < $6::date ORDER BY r.code,r.title,r.id`, period.ProfileYear, period.RuleID, uuidArrayToStrings(orgIDs), period.MonitoringPeriodID, period.Cycle, period.End.Format("2006-01-02"))
	if err != nil {
		return nil, fmt.Errorf("load profile progress risks: %w", err)
	}
	defer rows.Close()
	items := []entity.UnitProgressRisk{}
	for rows.Next() {
		var item entity.UnitProgressRisk
		if err := rows.Scan(&item.ID, &item.OrganizationID, &item.Code, &item.Title, &item.Status, &item.UpdatedAt, &item.MonitoringID, &item.MonitoringStatus, &item.ProfileChanged); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
