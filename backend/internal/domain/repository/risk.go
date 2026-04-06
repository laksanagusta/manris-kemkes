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
	List(ctx context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error)
	ListMitigations(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationAssoc, error)
	NextRiskCode(ctx context.Context) (string, error)
	// ListApprovedRisks returns all approved risks for trend analysis (includes all versions)
	ListApprovedRisks(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Risk, error)

	// Dashboard methods - cycle parameter filters by assessment_cycle, empty string uses current global state
	DashboardSummary(ctx context.Context, cycle string) (*entity.DashboardSummary, error)
	DashboardCategoryCounts(ctx context.Context, cycle string) ([]*entity.DashboardCategoryCount, error)
	HeatmapData(ctx context.Context, cycle string) ([]*entity.HeatmapCell, error)
	TopRisks(ctx context.Context, cycle string, limit int) ([]*entity.Risk, error)
	ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error)
	ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error)
	ActivateApprovedVersion(ctx context.Context, approvedRiskID uuid.UUID) error
	ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string) ([]*entity.RiskReviewQueueItem, error)
	CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error)
	RiskReviewSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.RiskReviewSummary, error)

	// Dashboard analytics
	GetHeatmapVelocity(ctx context.Context, fromCycle, toCycle string) ([]entity.HeatmapVelocityCell, error)
	GetOverdueMitigationTimeline(ctx context.Context) ([]entity.OverdueMitigationTimelineItem, error)
	GetKRIBreachSummary(ctx context.Context) ([]entity.KRIBreachItem, error)
	GetUnitResponseTime(ctx context.Context) ([]entity.UnitResponseTime, error)
}
