package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// repositoryDB is implemented by a pool and a transaction. Begin on pgx.Tx
// creates a savepoint, so repository commits cannot commit their caller's tx.
type repositoryDB interface {
	riskQueryer
	Begin(context.Context) (pgx.Tx, error)
}

func NewRiskRepositoryWithTx(tx pgx.Tx) repository.RiskRepository {
	return &riskRepository{pool: tx, preserveMitigationIDs: true}
}

func NewRiskEventRepositoryWithTx(tx pgx.Tx) repository.RiskEventRepository {
	return &riskEventRepository{pool: tx}
}

func NewRiskMonitoringRepositoryWithTx(tx pgx.Tx) repository.RiskMonitoringRepository {
	return &riskMonitoringRepository{pool: tx}
}

// The monitoring obligation ledger is implemented by the risk repository.
// Returning its concrete type exposes only its existing public methods.
func NewRiskMonitoringPeriodRepositoryWithTx(tx pgx.Tx) *riskRepository {
	return &riskRepository{pool: tx, preserveMitigationIDs: true}
}

func NewMitigationTaskRepositoryWithTx(tx pgx.Tx) repository.MitigationTaskRepository {
	return &mitigationTaskRepository{pool: tx}
}

func NewUserRepositoryWithTx(tx pgx.Tx) repository.UserRepository {
	return &userRepository{pool: tx}
}

func NewOrganizationRepositoryWithTx(tx pgx.Tx) repository.OrganizationRepository {
	return &organizationRepository{pool: tx}
}

func NewWorkingPaperRepositoryWithTx(tx pgx.Tx) repository.WorkingPaperRepository {
	return &workingPaperRepository{pool: tx}
}

// Agent draft edits never replace existing mitigation identities or cascade
// task history. Removal is intentionally not supported by this adapter.
func updateMitigationPreservingID(ctx context.Context, q riskQueryer, riskID uuid.UUID, m entity.Mitigation, order int) error {
	tag, err := q.Exec(ctx, `UPDATE mitigations SET
		action=$3, owner=$4, owner_user_id=$5, due_date=$6, frequency=$7,
		recurring_interval=$8, report_day=$9, report_date=$10, execution_schedule_text=$11,
		target_cost=$12, sort_order=$13, mitigation_type=$14, activity_stage=$15,
		expected_output=$16, quantitative_target=$17, supporting_unit=$18,
		resources_required=$19, contingency_plan=$20, potential_obstacle=$21,
		is_breakthrough_activity=$22, is_existing_control=$23
		WHERE id=$1 AND risk_id=$2`, m.ID, riskID, m.Action, m.Owner, m.OwnerUserID,
		nullableDateString(m.DueDate), normalizeMitigationFrequency(m.Frequency),
		m.RecurringInterval, m.ReportDay, m.ReportDate, m.ExecutionScheduleText,
		m.TargetCost, order, entity.NormalizeMitigationType(m.MitigationType), m.ActivityStage,
		m.ExpectedOutput, m.QuantitativeTarget, m.SupportingUnit, m.ResourcesRequired,
		m.ContingencyPlan, m.PotentialObstacle, m.IsBreakthroughActivity, m.IsExistingControl)
	if err != nil {
		return fmt.Errorf("update draft mitigation: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return fmt.Errorf("draft mitigation does not belong to risk")
	}
	return nil
}
