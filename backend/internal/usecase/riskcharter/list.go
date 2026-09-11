package riskcharter

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ListRiskChartersUseCase struct {
	repo repository.RiskCharterRepository
}

func NewListRiskChartersUseCase(repo repository.RiskCharterRepository) *ListRiskChartersUseCase {
	return &ListRiskChartersUseCase{repo: repo}
}

type ListRiskChartersInput struct {
	OrganizationID *uuid.UUID
	Period         string
	Query          string
	Page           int
	Limit          int
	Scope          *entity.AccessScope
}

type ListRiskChartersOutput struct {
	Data  []*entity.RiskCharter `json:"data"`
	Total int                   `json:"total"`
	Page  int                   `json:"page"`
	Limit int                   `json:"limit"`
}

func (uc *ListRiskChartersUseCase) Execute(ctx context.Context, input ListRiskChartersInput) (*ListRiskChartersOutput, error) {
	if input.Scope == nil {
		return nil, errors.ErrForbidden
	}
	if input.OrganizationID != nil && !canAccessRiskCharter(input.Scope, *input.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if input.OrganizationID == nil {
		input.OrganizationID = input.Scope.OrganizationID
	}
	if input.OrganizationID == nil {
		return nil, errors.ErrForbidden
	}
	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 || input.Limit > 100 {
		input.Limit = 10
	}

	items, total, err := uc.repo.List(ctx, repository.RiskCharterListFilter{
		OrganizationID: input.OrganizationID,
		Period:         strings.TrimSpace(input.Period),
		Query:          strings.TrimSpace(input.Query),
		Page:           input.Page,
		Limit:          input.Limit,
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*entity.RiskCharter{}
	}

	return &ListRiskChartersOutput{Data: items, Total: total, Page: input.Page, Limit: input.Limit}, nil
}
