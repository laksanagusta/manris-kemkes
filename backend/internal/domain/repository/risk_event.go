package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskEventRepository interface {
	Create(ctx context.Context, event *entity.RiskEvent, riskIDs []uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskEvent, error)
	List(ctx context.Context, orgIDs []uuid.UUID, riskID *uuid.UUID) ([]*entity.RiskEvent, error)
	ListPage(ctx context.Context, filter RiskEventListFilter) ([]*entity.RiskEvent, int, error)
	AddRiskLinks(ctx context.Context, eventID uuid.UUID, riskIDs []uuid.UUID, actorID uuid.UUID) error
}

type RiskEventListFilter struct {
	OrgIDs         []uuid.UUID
	RiskID         *uuid.UUID
	OrganizationID *uuid.UUID
	Query          string
	Severity       string
	SortBy         string
	SortOrder      string
	Page           int
	Limit          int
}
