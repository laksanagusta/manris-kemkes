package organizationgroup

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ListUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewListUseCase(groupRepo repository.OrganizationGroupRepository) *ListUseCase {
	return &ListUseCase{groupRepo: groupRepo}
}

type ListInput struct {
	OwnerOrganizationID *uuid.UUID
	GroupID             *uuid.UUID
	Q                   string
	SortBy              string
	SortOrder           string
	Page                int
	Limit               int
	IncludeMembers      bool
	Scope               *entity.AccessScope
}

type ListOutput struct {
	Data  []*entity.OrganizationGroup `json:"data"`
	Total int                         `json:"total"`
	Page  int                         `json:"page"`
	Limit int                         `json:"limit"`
}

func (uc *ListUseCase) Execute(ctx context.Context, input ListInput) (*ListOutput, error) {
	page, limit := normalizePageLimit(input.Page, input.Limit)

	ownerID, err := listOwner(input)
	if err != nil {
		return nil, err
	}

	items, total, err := uc.groupRepo.List(ctx, repository.OrganizationGroupListFilter{
		OwnerOrganizationID: ownerID,
		GroupID:             input.GroupID,
		Q:                   strings.TrimSpace(input.Q),
		SortBy:              input.SortBy,
		SortOrder:           input.SortOrder,
		Page:                page,
		Limit:               limit,
		IncludeMembers:      input.IncludeMembers,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to list organization groups")
	}
	if items == nil {
		items = []*entity.OrganizationGroup{}
	}

	return &ListOutput{
		Data:  items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (uc *ListUseCase) Options(ctx context.Context, input ListInput) ([]repository.OrganizationGroupOption, error) {
	ownerID, err := listOwner(input)
	if err != nil {
		return nil, err
	}
	options, err := uc.groupRepo.ListOptions(ctx, ownerID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list organization group options")
	}
	return options, nil
}

func listOwner(input ListInput) (*uuid.UUID, error) {
	if input.Scope == nil || input.Scope.IsGlobal {
		return input.OwnerOrganizationID, nil
	}
	if input.Scope.OrganizationID == nil {
		return nil, errors.ErrForbidden
	}
	if input.OwnerOrganizationID != nil && *input.OwnerOrganizationID != *input.Scope.OrganizationID {
		return nil, errors.ErrForbidden
	}
	return input.Scope.OrganizationID, nil
}
