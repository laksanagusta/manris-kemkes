package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskCharterListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Query          string
	Page           int
	Limit          int
}

type RiskCharterRepository interface {
	Create(ctx context.Context, charter *entity.RiskCharter) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCharter, error)
	UpdateDraft(ctx context.Context, charter *entity.RiskCharter) error
	List(ctx context.Context, filter RiskCharterListFilter) ([]*entity.RiskCharter, int, error)
	FindExistingByOrgPeriodLevel(ctx context.Context, organizationID uuid.UUID, period, uprLevel string) (*entity.RiskCharter, error)
	Finalize(ctx context.Context, charter *entity.RiskCharter) error
	CreateRevision(ctx context.Context, source *entity.RiskCharter, revision *entity.RiskCharter) error
	ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.RiskCharter, error)
	Archive(ctx context.Context, id uuid.UUID) error
	Restore(ctx context.Context, charter *entity.RiskCharter) error
	DeleteDraft(ctx context.Context, id uuid.UUID) error
}
