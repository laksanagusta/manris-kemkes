package riskcascade

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type ListUseCase struct {
	repo repository.RiskCascadeRepository
}

type ListInput struct {
	OrgIDs      []uuid.UUID
	Status      string
	CascadeType string
	Query       string
	Page        int
	Limit       int
}

type ListOutput struct {
	Data  []*entity.RiskCascade `json:"data"`
	Total int                   `json:"total"`
	Page  int                   `json:"page"`
	Limit int                   `json:"limit"`
}

func NewListUseCase(repo repository.RiskCascadeRepository) *ListUseCase {
	return &ListUseCase{repo: repo}
}

func (uc *ListUseCase) Execute(ctx context.Context, input ListInput) (*ListOutput, error) {
	page := input.Page
	if page < 1 {
		page = 1
	}
	limit := input.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	items, total, err := uc.repo.List(ctx, repository.RiskCascadeListFilter{
		OrgIDs:      input.OrgIDs,
		Status:      strings.TrimSpace(input.Status),
		CascadeType: strings.TrimSpace(input.CascadeType),
		Query:       strings.TrimSpace(input.Query),
		Page:        page,
		Limit:       limit,
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*entity.RiskCascade{}
	}

	return &ListOutput{Data: items, Total: total, Page: page, Limit: limit}, nil
}
