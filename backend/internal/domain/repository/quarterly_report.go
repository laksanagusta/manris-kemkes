package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// QuarterlyReportRepository resolves report-only historical semantics, without
// changing operational register or monitoring endpoint behavior.
type QuarterlyReportRepository interface {
	ListOrganizations(context.Context, []uuid.UUID) ([]entity.QuarterlyReportOrganization, error)
	LoadPeriod(context.Context, string, time.Time, time.Time, []uuid.UUID) (*entity.QuarterlyReportPeriodData, error)
	ReadSnapshot(context.Context, QuarterlyReportPeriod, QuarterlyReportPeriod, []uuid.UUID) (*entity.QuarterlyReportSnapshot, error)
}

type QuarterlyReportPeriod struct {
	Cycle      string
	Start, End time.Time
}
