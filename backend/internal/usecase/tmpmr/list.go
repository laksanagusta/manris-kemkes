package tmpmr

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ListUseCase struct {
	repo repository.TMPMRRepository
}

func NewListUseCase(repo repository.TMPMRRepository) *ListUseCase {
	return &ListUseCase{repo: repo}
}

type ListInput struct {
	OrganizationID *uuid.UUID
	Period         string
	Page           int
	Limit          int
	Scope          *entity.AccessScope
}

type ListOutput struct {
	Data  []*entity.TMPMRAssessment `json:"data"`
	Total int                       `json:"total"`
	Page  int                       `json:"page"`
	Limit int                       `json:"limit"`
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
		if !canAccessTMPMRRead(input.Scope, *input.OrganizationID) {
			return nil, errors.ErrForbidden
		}
		orgID = input.OrganizationID
	} else if input.Scope != nil && !input.Scope.IsGlobal && input.Scope.OrganizationID != nil {
		orgID = input.Scope.OrganizationID
	}

	items, total, err := uc.repo.List(ctx, repository.TMPMRListFilter{
		OrganizationID: orgID,
		Period:         strings.TrimSpace(input.Period),
		Page:           page,
		Limit:          limit,
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*entity.TMPMRAssessment{}
	}

	return &ListOutput{Data: items, Total: total, Page: page, Limit: limit}, nil
}
