package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type PerformanceRiskRepository interface {
	ListPlanningNodes(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error)
	ListRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error)
	ListMitigationRowsByROID(ctx context.Context, roID uuid.UUID, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error)
	ListUnlinkedRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error)
}
