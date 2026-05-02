package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type FormalReportListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	ReportType     string
	Status         string
	Page           int
	Limit          int
}

type FormalReportRepository interface {
	UpsertGenerated(ctx context.Context, report *entity.FormalReport) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.FormalReport, error)
	List(ctx context.Context, filter FormalReportListFilter) ([]*entity.FormalReport, int, error)
}
