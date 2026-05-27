package evaluation

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ListUseCase struct {
	repo repository.EvaluationRepository
}

func NewListUseCase(repo repository.EvaluationRepository) *ListUseCase {
	return &ListUseCase{repo: repo}
}

type ListInput struct {
	OrganizationID *uuid.UUID
	Period         string
	Status         string
	Query          string
	Page           int
	Limit          int
	Scope          *entity.AccessScope
}

type ListOutput struct {
	Data  []*entity.Evaluation `json:"data"`
	Total int                  `json:"total"`
	Page  int                  `json:"page"`
	Limit int                  `json:"limit"`
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

	var orgID *uuid.UUID
	if input.OrganizationID != nil {
		if !canRead(input.Scope, *input.OrganizationID) {
			return nil, errors.ErrForbidden
		}
		orgID = input.OrganizationID
	} else if input.Scope != nil && !input.Scope.IsGlobal && input.Scope.OrganizationID != nil {
		orgID = input.Scope.OrganizationID
	}

	items, total, err := uc.repo.List(ctx, repository.EvaluationListFilter{
		OrganizationID: orgID,
		Period:         strings.TrimSpace(input.Period),
		Status:         strings.TrimSpace(input.Status),
		Query:          strings.TrimSpace(input.Query),
		Page:           page,
		Limit:          limit,
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*entity.Evaluation{}
	}

	return &ListOutput{Data: items, Total: total, Page: page, Limit: limit}, nil
}
