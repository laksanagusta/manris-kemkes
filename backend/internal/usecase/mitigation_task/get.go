package mitigation_task

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func (uc *ListTasksUseCase) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MitigationTask, error) {
	return uc.taskRepo.GetByID(ctx, id, orgIDs)
}
