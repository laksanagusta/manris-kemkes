package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type AnnualMemberExclusionInput struct {
	ChangeReason string `json:"changeReason"`
}

type AnnualMemberExclusion struct {
	GroupID       uuid.UUID `json:"groupId"`
	Code          string    `json:"code"`
	Title         string    `json:"title"`
	EffectiveFrom *string   `json:"effectiveFrom"`
	ChangeReason  string    `json:"changeReason"`
}

func (s *UPRWorkflow) ExcludeAnnualMember(ctx context.Context, org, actor, profile, group uuid.UUID, input AnnualMemberExclusionInput) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := lockUPROrganization(ctx, tx, org); err != nil {
		return err
	}
	if _, err := lockAnnualDraft(ctx, tx, org, profile); err != nil {
		return err
	}
	reason := strings.TrimSpace(input.ChangeReason)
	if reason == "" || len([]rune(reason)) > 2000 {
		return UPRWorkflowError("Isi alasan pengeluaran risiko, maksimal 2.000 karakter.")
	}
	var inherited bool
	err = tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1
		FROM annual_risk_profile_versions p
		JOIN annual_risk_profile_members previous ON previous.profile_version_id=p.previous_version_id
		JOIN annual_risk_profile_members current ON current.profile_version_id=p.id AND current.version_group_id=previous.version_group_id
		WHERE p.id=$1 AND previous.version_group_id=$2)`, profile, group).Scan(&inherited)
	if err != nil {
		return err
	}
	if !inherited {
		return ErrUPRNotFound
	}
	result, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_exclusions
		(profile_version_id,version_group_id,change_reason,created_by)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (profile_version_id,version_group_id) DO UPDATE
		SET change_reason=EXCLUDED.change_reason,created_by=EXCLUDED.created_by,created_at=now()
		WHERE annual_risk_profile_exclusions.change_reason IS DISTINCT FROM EXCLUDED.change_reason`,
		profile, group, reason, actor)
	if err != nil {
		return err
	}
	if result.RowsAffected() > 0 {
		if err := touchAnnualDraft(ctx, tx, profile); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *UPRWorkflow) CancelAnnualMemberExclusion(ctx context.Context, org, profile, group uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := lockAnnualDraft(ctx, tx, org, profile); err != nil {
		return err
	}
	result, err := tx.Exec(ctx, `DELETE FROM annual_risk_profile_exclusions WHERE profile_version_id=$1 AND version_group_id=$2`, profile, group)
	if err != nil {
		return err
	}
	if result.RowsAffected() > 0 {
		if err := touchAnnualDraft(ctx, tx, profile); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// Validate the coverage affected by the finalization date.
func validateAnnualExclusions(ctx context.Context, tx pgx.Tx, profile uuid.UUID) error {
	var label string
	var locked bool
	err := tx.QueryRow(ctx, `SELECT period.label, frozen.locked_at IS NOT NULL
		FROM annual_risk_profile_exclusions x
		JOIN annual_risk_profile_versions p ON p.id=x.profile_version_id
		JOIN monitoring_rule_periods period ON period.rule_id=p.monitoring_rule_id
		CROSS JOIN LATERAL annual_monitoring_period_bounds(period.id) bounds
		LEFT JOIN LATERAL annual_monitoring_period_freeze(p.id,period.id) frozen ON true
		WHERE x.profile_version_id=$1 AND x.effective_from<=bounds.ends_on
		AND (frozen.locked_at IS NOT NULL OR EXISTS (
			SELECT 1 FROM risk_monitorings rm
			JOIN risks r ON r.id=rm.source_risk_id
			WHERE r.organization_id=p.organization_id AND rm.version_group_id=x.version_group_id
			AND rm.monitoring_period_id=period.id AND rm.transaction_kind='monitoring'
			AND rm.status IN ('draft','final') AND rm.superseded_by_monitoring_id IS NULL
		))
		ORDER BY period.ordinal, frozen.locked_at IS NULL
		LIMIT 1`, profile).Scan(&label, &locked)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("check annual profile exclusion periods: %w", err)
	}
	if locked {
		return UPRWorkflowError(fmt.Sprintf("Pengeluaran risiko tidak bisa difinalisasi karena %s sudah terkunci.", label))
	}
	return UPRWorkflowError(fmt.Sprintf("Pengeluaran risiko tidak bisa difinalisasi karena risiko sudah memiliki pemantauan pada %s.", label))
}
