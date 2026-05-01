package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskCharterListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Page           int
	Limit          int
}

type RiskCharterRepository interface {
	Create(ctx context.Context, charter *entity.RiskCharter) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCharter, error)
	Update(ctx context.Context, charter *entity.RiskCharter) error
	List(ctx context.Context, filter RiskCharterListFilter) ([]*entity.RiskCharter, int, error)
	ExistsByOrgPeriodLevel(ctx context.Context, organizationID uuid.UUID, period, uprLevel string, excludeID *uuid.UUID) (bool, error)
}
