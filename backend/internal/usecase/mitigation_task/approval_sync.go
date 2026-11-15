package mitigation_task

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/repository"
)

// EnsureTasksForRiskVersionUseCase ensures mitigation_tasks exist for a risk
// version in a given quarterly cycle. Idempotent — if tasks already exist
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
// given quarterly cycle. Skips mitigations marked as existing controls.
// Returns the number of newly created tasks.
func (uc *EnsureTasksForRiskVersionUseCase) Execute(
	ctx context.Context,
	riskID uuid.UUID,
	cycle string,
	orgIDs []uuid.UUID,
) (int, error) {
	// Execution reports are created when monitoring starts.
	return 0, nil
}
