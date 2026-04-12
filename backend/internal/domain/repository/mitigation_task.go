package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// MitigationTaskRepository defines the interface for mitigation task data access
type MitigationTaskRepository interface {
	// Create inserts a new mitigation task
	Create(ctx context.Context, task *entity.MitigationTask) error

	// GetByID retrieves a task by ID
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MitigationTask, error)

	// Update updates an existing task (progress submission)
	Update(ctx context.Context, task *entity.MitigationTask) error

	// ListByRisk returns all tasks for a given risk
	ListByRisk(ctx context.Context, riskID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error)

	// ListByMitigation returns all tasks for a given mitigation plan
	ListByMitigation(ctx context.Context, mitigationID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error)

	// ListByUser returns all tasks assigned to a specific user (via mitigation owner)
	ListByUser(ctx context.Context, userID uuid.UUID, status string, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error)

	// ListPendingOverdue returns tasks that are past due_date but status is still pending
	ListPendingOverdue(ctx context.Context, referenceDate time.Time) ([]*entity.MitigationTask, error)

	// GetRecurringMitigations returns all mitigations with frequency='rutin' that need task generation
	GetRecurringMitigations(ctx context.Context) ([]*entity.Mitigation, error)

	// ListAll returns all mitigation tasks (for compliance monitoring dashboard)
	ListAll(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error)

	// ListAllPaginated returns a page of mitigation tasks with total count
	ListAllPaginated(ctx context.Context, orgIDs []uuid.UUID, page, limit int) ([]*entity.MitigationTask, int, error)

	// TaskExistsForPeriod checks if a task already exists for a mitigation in a given period
	TaskExistsForPeriod(ctx context.Context, mitigationID uuid.UUID, periodStart, periodEnd string) (bool, error)
}
