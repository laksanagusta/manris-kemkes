package mitigation_task

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// EnsureTasksForRiskVersionUseCase ensures mitigation_tasks exist for a risk
// version in a given semester cycle. Idempotent — if tasks already exist
// for this cycle, no new tasks are created.
type EnsureTasksForRiskVersionUseCase struct {
	taskRepo repository.MitigationTaskRepository
	riskRepo repository.RiskRepository
}

func NewEnsureTasksForRiskVersionUseCase(
	taskRepo repository.MitigationTaskRepository,
	riskRepo repository.RiskRepository,
) *EnsureTasksForRiskVersionUseCase {
	return &EnsureTasksForRiskVersionUseCase{
		taskRepo: taskRepo,
		riskRepo: riskRepo,
	}
}

// Execute generates one mitigation_task per mitigation plan item for the
// given semester cycle. Skips mitigations marked as existing controls.
// Returns the number of newly created tasks.
func (uc *EnsureTasksForRiskVersionUseCase) Execute(
	ctx context.Context,
	riskID uuid.UUID,
	cycle string,
	orgIDs []uuid.UUID,
) (int, error) {
	risk, err := uc.riskRepo.GetByID(ctx, riskID, orgIDs)
	if err != nil {
		return 0, fmt.Errorf("gagal memuat risiko: %w", err)
	}

	year, half, err := ParseSemesterCycle(cycle)
	if err != nil {
		return 0, err
	}

	periodStart := SemesterPeriodStart(year, half)
	dueDate := SemesterDueDate(year, half)
	periodEnd := dueDate

	created := 0
	for _, mitigation := range risk.Mitigations {
		if mitigation.ID == uuid.Nil {
			continue
		}
		if mitigation.IsExistingControl {
			continue
		}

		exists, err := uc.taskRepo.TaskExistsForPeriod(ctx, mitigation.ID, periodStart, periodEnd)
		if err != nil {
			return created, fmt.Errorf("gagal memeriksa keberadaan tugas: %w", err)
		}
		if exists {
			continue
		}

		task := &entity.MitigationTask{
			MitigationID: mitigation.ID,
			RiskID:       risk.ID,
			PeriodLabel:  cycle,
			PeriodStart:  periodStart,
			PeriodEnd:    periodEnd,
			DueDate:      dueDate,
			Status:       "pending",
			GeneratedBy:  "manual",
		}
		if err := uc.taskRepo.Create(ctx, task); err != nil {
			return created, fmt.Errorf("gagal membuat tugas mitigasi: %w", err)
		}
		created++
	}

	return created, nil
}
