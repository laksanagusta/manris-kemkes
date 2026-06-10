package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type listRiskMonitoringsRepository interface {
	List(ctx context.Context, filter repository.RiskMonitoringListFilter) ([]*entity.RiskMonitoring, int, error)
}

type ListRiskMonitoringsUseCase struct {
	monitoringRepo listRiskMonitoringsRepository
}

func NewListRiskMonitoringsUseCase(monitoringRepo listRiskMonitoringsRepository) *ListRiskMonitoringsUseCase {
	return &ListRiskMonitoringsUseCase{monitoringRepo: monitoringRepo}
}

type ListRiskMonitoringsInput struct {
	OrgIDs          []uuid.UUID
	Query           string
	Lifecycle       string
	Category        string
	AssessmentCycle string
	CreatedAt       string
	Status          string
	Page            int
	Limit           int
	SortBy          string
	SortOrder       string
}

type ListRiskMonitoringsResult struct {
	Data  []*entity.RiskMonitoring
	Total int
	Page  int
	Limit int
}

func (uc *ListRiskMonitoringsUseCase) Execute(ctx context.Context, input ListRiskMonitoringsInput) (*ListRiskMonitoringsResult, error) {
	if uc.monitoringRepo == nil {
		return nil, domainerrors.ErrInvalidInput
	}
	if input.Page <= 0 {
		input.Page = 1
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}

	items, total, err := uc.monitoringRepo.List(ctx, repository.RiskMonitoringListFilter{
		OrgIDs:          input.OrgIDs,
		Query:           input.Query,
		Lifecycle:       input.Lifecycle,
		Category:        input.Category,
		AssessmentCycle: input.AssessmentCycle,
		CreatedAt:       input.CreatedAt,
		Status:          input.Status,
		Page:            input.Page,
		Limit:           input.Limit,
		SortBy:          input.SortBy,
		SortOrder:       input.SortOrder,
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*entity.RiskMonitoring{}
	}

	return &ListRiskMonitoringsResult{
		Data:  items,
		Total: total,
		Page:  input.Page,
		Limit: input.Limit,
	}, nil
}
