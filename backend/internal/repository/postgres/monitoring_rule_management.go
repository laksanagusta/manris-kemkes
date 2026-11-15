package postgres

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

// Lock before checking usage: profile selection takes a share lock on this row.
func lockMonitoringRule(ctx context.Context, tx pgx.Tx, id uuid.UUID) (*entity.MonitoringRule, error) {
	r := &entity.MonitoringRule{ID: id}
	err := tx.QueryRow(ctx, `SELECT name,year,frequency,active FROM monitoring_rules WHERE id=$1 FOR UPDATE`, id).Scan(&r.Name, &r.Year, &r.Frequency, &r.Active)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_risk_profile_versions WHERE monitoring_rule_id=$1)`, id).Scan(&r.InUse); err != nil {
		return nil, err
	}
	r.Periods, err = readRulePeriods(ctx, tx, id)
	return r, err
}

func sameMonitoringSchedule(a, b entity.MonitoringRule) bool {
	if a.Name != b.Name || a.Year != b.Year || a.Frequency != b.Frequency || len(a.Periods) != len(b.Periods) {
		return false
	}
	for _, p := range a.Periods {
		found := false
		for _, q := range b.Periods {
			if p.Ordinal == q.Ordinal && p.Label == q.Label && p.OpensOn == q.OpensOn && p.ClosesOn == q.ClosesOn {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func (s *UPRWorkflow) UpdateMonitoringRule(ctx context.Context, id uuid.UUID, r entity.MonitoringRule) (*entity.MonitoringRule, error) {
	r.Name = strings.TrimSpace(r.Name)
	for i := range r.Periods {
		r.Periods[i].Label = strings.TrimSpace(r.Periods[i].Label)
	}
	if err := r.Validate(); err != nil {
		return nil, UPRWorkflowError(err.Error())
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	current, err := lockMonitoringRule(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if current.InUse {
		if !sameMonitoringSchedule(*current, r) {
			return nil, UPRWorkflowError("Aturan sudah dipakai profil. Hanya status aktif yang dapat diubah.")
		}
		if _, err = tx.Exec(ctx, `UPDATE monitoring_rules SET active=$2 WHERE id=$1`, id, r.Active); err != nil {
			return nil, err
		}
		current.Active = r.Active
		if err = tx.Commit(ctx); err != nil {
			return nil, err
		}
		return current, nil
	}
	if _, err = tx.Exec(ctx, `UPDATE monitoring_rules SET name=$2,year=$3,frequency=$4,active=$5 WHERE id=$1`, id, r.Name, r.Year, r.Frequency, r.Active); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM monitoring_rule_periods WHERE rule_id=$1`, id); err != nil {
		return nil, err
	}
	for i := range r.Periods {
		p := &r.Periods[i]
		p.ID = uuid.New()
		if _, err = tx.Exec(ctx, `INSERT INTO monitoring_rule_periods(id,rule_id,label,ordinal,opens_on,closes_on) VALUES($1,$2,$3,$4,$5::date,$6::date)`, p.ID, id, p.Label, p.Ordinal, p.OpensOn, p.ClosesOn); err != nil {
			return nil, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	r.ID, r.InUse = id, false
	return &r, nil
}

func (s *UPRWorkflow) DeleteMonitoringRule(ctx context.Context, id uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	r, err := lockMonitoringRule(ctx, tx, id)
	if err != nil {
		return err
	}
	if r.InUse {
		return UPRWorkflowError("Aturan sudah dipakai profil dan tidak dapat dihapus. Nonaktifkan untuk mencegah pemilihan baru.")
	}
	if _, err = tx.Exec(ctx, `DELETE FROM monitoring_rules WHERE id=$1`, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
