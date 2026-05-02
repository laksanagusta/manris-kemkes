package mitigation_task

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// EnsureTasksForApprovedRiskUseCase creates one reporting task per mitigation
// when a risk becomes approved/finalized.
type EnsureTasksForApprovedRiskUseCase struct {
	taskRepo repository.MitigationTaskRepository
	riskRepo repository.RiskRepository
}

func NewEnsureTasksForApprovedRiskUseCase(taskRepo repository.MitigationTaskRepository, riskRepo repository.RiskRepository) *EnsureTasksForApprovedRiskUseCase {
	return &EnsureTasksForApprovedRiskUseCase{
		taskRepo: taskRepo,
		riskRepo: riskRepo,
	}
}

func (uc *EnsureTasksForApprovedRiskUseCase) Execute(ctx context.Context, riskID uuid.UUID, orgIDs []uuid.UUID) (int, error) {
	risk, err := uc.riskRepo.GetByID(ctx, riskID, orgIDs)
	if err != nil {
		return 0, fmt.Errorf("load approved risk: %w", err)
	}
	if risk.Status != entity.RiskStatusApproved {
		return 0, nil
	}

	created := 0
	for _, mitigation := range risk.Mitigations {
		if mitigation.ID == uuid.Nil || mitigation.DueDate == nil || *mitigation.DueDate == "" {
			continue
		}
		if mitigation.IsExistingControl {
			continue
		}

		dueDate := *mitigation.DueDate
		exists, err := uc.taskRepo.TaskExistsForPeriod(ctx, mitigation.ID, dueDate, dueDate)
		if err != nil {
			return created, fmt.Errorf("check mitigation task existence: %w", err)
		}
		if exists {
			continue
		}

		task := &entity.MitigationTask{
			MitigationID: mitigation.ID,
			RiskID:       risk.ID,
			PeriodLabel:  mitigationTaskPeriodLabel(risk.AssessmentCycle),
			PeriodStart:  dueDate,
			PeriodEnd:    dueDate,
			DueDate:      dueDate,
			Status:       "pending",
			GeneratedBy:  "manual",
		}
		if err := uc.taskRepo.Create(ctx, task); err != nil {
			return created, fmt.Errorf("create mitigation task: %w", err)
		}
		created++
	}

	return created, nil
}
