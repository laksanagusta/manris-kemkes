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

type MonitoringRuleSearch struct {
	Query string
	Limit int
}

func (s *UPRWorkflow) MonitoringRules(ctx context.Context, includeInactive bool, search ...MonitoringRuleSearch) ([]entity.MonitoringRule, error) {
	query := `SELECT id,name,year,frequency,active,EXISTS(SELECT 1 FROM annual_risk_profile_versions p WHERE p.monitoring_rule_id=monitoring_rules.id) FROM monitoring_rules WHERE (active OR $1)`
	args := []any{includeInactive}
	if len(search) > 0 {
		query += ` AND (strpos(lower(name),lower($2))>0 OR strpos(year::text,$2)>0) ORDER BY year DESC,created_at DESC,id DESC LIMIT $3`
		args = append(args, strings.TrimSpace(search[0].Query), search[0].Limit)
	} else {
		query += ` ORDER BY year DESC,name,id`
	}
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	rules, err := pgx.CollectRows(rows, pgx.RowToStructByPos[ruleHeader])
	if err != nil {
		return nil, err
	}
	out := make([]entity.MonitoringRule, 0, len(rules))
	for _, header := range rules {
		r := entity.MonitoringRule{ID: header.ID, Name: header.Name, Year: header.Year, Frequency: header.Frequency, Active: header.Active, InUse: header.InUse}
		r.Periods, err = readRulePeriods(ctx, s.pool, r.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, nil
}

type ruleHeader struct {
	ID        uuid.UUID
	Name      string
	Year      int
	Frequency string
	Active    bool
	InUse     bool
}

func readRulePeriods(ctx context.Context, db riskQueryer, id uuid.UUID) ([]entity.MonitoringRulePeriod, error) {
	rows, err := db.Query(ctx, `SELECT id,label,ordinal,opens_on::text,closes_on::text FROM monitoring_rule_periods WHERE rule_id=$1 ORDER BY ordinal`, id)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[entity.MonitoringRulePeriod])
}
func (s *UPRWorkflow) CreateMonitoringRule(ctx context.Context, actor uuid.UUID, r entity.MonitoringRule) (*entity.MonitoringRule, error) {
	r.Name = strings.TrimSpace(r.Name)
	if err := r.Validate(); err != nil {
		return nil, UPRWorkflowError(err.Error())
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	r.ID = uuid.New()
	if _, err = tx.Exec(ctx, `INSERT INTO monitoring_rules(id,name,year,frequency,active,created_by) VALUES($1,$2,$3,$4,$5,$6)`, r.ID, r.Name, r.Year, r.Frequency, r.Active, actor); err != nil {
		return nil, err
	}
	for i := range r.Periods {
		p := &r.Periods[i]
		p.ID = uuid.New()
		p.Label = strings.TrimSpace(p.Label)
		if _, err = tx.Exec(ctx, `INSERT INTO monitoring_rule_periods(id,rule_id,label,ordinal,opens_on,closes_on) VALUES($1,$2,$3,$4,$5::date,$6::date)`, p.ID, r.ID, p.Label, p.Ordinal, p.OpensOn, p.ClosesOn); err != nil {
			return nil, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &r, nil
}

// ValidateMonitoringContext runs before existing-draft lookup as well as before
// insertion, so callers cannot obtain a legacy draft to bypass a selected rule.
func (r *riskMonitoringRepository) ValidateMonitoringContext(ctx context.Context, source *entity.Risk, profile, period *uuid.UUID, date string) error {
	if source.OrganizationID == nil {
		return domainerrors.ErrInvalidInput
	}
	if (profile == nil) != (period == nil) {
		return monitoringInputError("Pilih profil dan periode pemantauan.")
	}
	if profile == nil {
		var configured bool
		err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_risk_profile_members m JOIN annual_risk_profile_versions p ON p.id=m.profile_version_id WHERE m.version_group_id=$1 AND p.organization_id=$2 AND p.monitoring_rule_id IS NOT NULL)`, source.VersionGroupID, source.OrganizationID).Scan(&configured)
		if err != nil {
			return err
		}
		if configured {
			return monitoringInputError("Buka profil tahunan dan pilih periode pemantauan untuk risiko ini.")
		}
		return nil
	}
	if err := assertConfiguredPeriod(ctx, r.pool, *profile, *period, *source.OrganizationID); err != nil {
		return err
	}
	var valid bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_monitoring_members_as_of(annual_monitoring_period_profile($1,$3), $4::date) WHERE version_group_id=$2) AND monitoring_observation_in_period($1,$3,$4::date)`, profile, source.VersionGroupID, period, date).Scan(&valid)
	if err != nil {
		return err
	}
	if !valid {
		return monitoringInputError("Risiko atau tanggal pengamatan tidak sesuai profil dan periode terpilih.")
	}
	return nil
}
func assertConfiguredPeriod(ctx context.Context, db riskQueryer, profile, period, org uuid.UUID) error {
	_, err := db.Exec(ctx, `SELECT assert_monitoring_period_open($1,$2,$3)`, profile, period, org)
	if err != nil {
		return fmt.Errorf("validate monitoring period: %w", err)
	}
	return nil
}
func monitoringInputError(message string) error {
	return &domainerrors.AppError{Code: "INVALID_INPUT", Message: message}
}
func (r *riskMonitoringRepository) GetByProfilePeriod(ctx context.Context, group, profile, period uuid.UUID) (*entity.RiskMonitoring, error) {
	m, err := scanRiskMonitoring(r.pool.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.transaction_kind='monitoring' AND rm.version_group_id=$1 AND rm.profile_version_id IN (SELECT p.id FROM annual_risk_profile_versions p JOIN annual_risk_profile_versions selected ON selected.organization_id=p.organization_id AND selected.year=p.year WHERE selected.id=$2) AND rm.monitoring_period_id=$3 LIMIT 1`, group, profile, period))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return m, err
}

func (r *evaluationRepository) ConfiguredEvaluationPeriod(ctx context.Context, profile, period, org uuid.UUID) (string, error) {
	if err := assertConfiguredPeriod(ctx, r.pool, profile, period, org); err != nil {
		return "", err
	}
	var result string
	err := r.pool.QueryRow(ctx, `SELECT p.year::text||CASE r.frequency WHEN 'monthly' THEN '-M' WHEN 'quarterly' THEN '-Q' ELSE '-H' END||rp.ordinal::text FROM annual_risk_profile_versions p JOIN monitoring_rules r ON r.id=p.monitoring_rule_id JOIN monitoring_rule_periods rp ON rp.rule_id=r.id WHERE p.id=$1 AND rp.id=$2`, profile, period).Scan(&result)
	return result, err
}
