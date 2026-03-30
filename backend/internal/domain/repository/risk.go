package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// RiskRepository defines the interface for risk data access
type RiskRepository interface {
	Create(ctx context.Context, risk *entity.Risk) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Risk, error)
	Update(ctx context.Context, risk *entity.Risk) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, orgID *uuid.UUID, status string) ([]*entity.Risk, error)
	ListMitigations(ctx context.Context, orgID *uuid.UUID) ([]*entity.MitigationAssoc, error)
	NextRiskCode(ctx context.Context) (string, error)

	// Dashboard methods
	DashboardSummary(ctx context.Context) (*entity.DashboardSummary, error)
	HeatmapData(ctx context.Context) ([]*entity.HeatmapCell, error)
	TopRisks(ctx context.Context, limit int) ([]*entity.Risk, error)
}
