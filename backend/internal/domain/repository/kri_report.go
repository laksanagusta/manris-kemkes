package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// KRIReportRepository defines the interface for KRI report data access
type KRIReportRepository interface {
	Create(ctx context.Context, report *entity.KRIReport) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.KRIReport, error)
	Update(ctx context.Context, report *entity.KRIReport) error
	ListByKRI(ctx context.Context, kriID uuid.UUID) ([]*entity.KRIReport, error)
	ListByUser(ctx context.Context, userID uuid.UUID, status string) ([]*entity.KRIReport, error)
	ListPendingOverdue(ctx context.Context, referenceDate time.Time) ([]*entity.KRIReport, error)
	ReportExistsForPeriod(ctx context.Context, kriID uuid.UUID, periodStart, periodEnd string) (bool, error)
	GetAllKRIs(ctx context.Context) ([]*entity.KRI, error)
}
