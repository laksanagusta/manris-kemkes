package organization

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type ListOrganizationsWithFilterUseCase struct {
	orgRepo repository.OrganizationRepository
}

func NewListOrganizationsWithFilterUseCase(orgRepo repository.OrganizationRepository) *ListOrganizationsWithFilterUseCase {
	return &ListOrganizationsWithFilterUseCase{orgRepo: orgRepo}
}

type ListOrganizationsWithFilterInput struct {
	Page  int
	Limit int
	Q     string
}

type ListOrganizationsWithFilterOutput struct {
	Data  []*entity.Organization `json:"data"`
	Total int                    `json:"total"`
	Page  int                    `json:"page"`
	Limit int                    `json:"limit"`
}

func (uc *ListOrganizationsWithFilterUseCase) Execute(ctx context.Context, input ListOrganizationsWithFilterInput) (*ListOrganizationsWithFilterOutput, error) {
	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 || input.Limit > 100 {
		input.Limit = 10
	}

	orgs, total, err := uc.orgRepo.ListWithFilter(ctx, repository.OrganizationListFilter{
		Page:  input.Page,
		Limit: input.Limit,
		Q:     input.Q,
	})
	if err != nil {
		return nil, err
	}

	if orgs == nil {
		orgs = []*entity.Organization{}
	}

	return &ListOrganizationsWithFilterOutput{
		Data:  orgs,
		Total: total,
		Page:  input.Page,
		Limit: input.Limit,
	}, nil
}
