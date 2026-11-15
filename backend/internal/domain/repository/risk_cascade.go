package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskCascadeListFilter struct {
	OrgIDs         []uuid.UUID
	OrganizationID *uuid.UUID
	SortBy         string
	SortOrder      string
	Status         string
	CascadeType    string
	Query          string
	Page           int
	Limit          int
}

type RiskCascadeSummary struct {
	Total    int `json:"total"`
	Pending  int `json:"pending"`
	Approved int `json:"approved"`
	BottomUp int `json:"bottomUp"`
}

type RiskCascadeRepository interface {
	Summary(ctx context.Context, orgIDs []uuid.UUID) (RiskCascadeSummary, error)
	Create(ctx context.Context, cascade *entity.RiskCascade) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCascade, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Update(ctx context.Context, cascade *entity.RiskCascade) error
	List(ctx context.Context, filter RiskCascadeListFilter) ([]*entity.RiskCascade, int, error)
}
