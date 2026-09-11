package riskcharter

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateRiskCharterUseCase struct {
	repo repository.RiskCharterRepository
}

func NewCreateRiskCharterUseCase(repo repository.RiskCharterRepository) *CreateRiskCharterUseCase {
	return &CreateRiskCharterUseCase{repo: repo}
}

type CreateRiskCharterInput struct {
	Title          string              `json:"title"`
	OrganizationID uuid.UUID           `json:"organizationId"`
	UPRLevel       string              `json:"uprLevel"`
	Period         string              `json:"period"`
	CreatedBy      uuid.UUID           `json:"-"`
	Scope          *entity.AccessScope `json:"-"`
}

type CreateRiskCharterOutput struct {
	Charter  *entity.RiskCharter `json:"data"`
	Existing bool                `json:"existing"`
}

func (uc *CreateRiskCharterUseCase) Execute(ctx context.Context, input CreateRiskCharterInput) (*CreateRiskCharterOutput, error) {
	if !canAccessRiskCharter(input.Scope, input.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	title := strings.TrimSpace(input.Title)
	period := strings.TrimSpace(input.Period)
	uprLevel := strings.TrimSpace(input.UPRLevel)
	groupID := uuid.New()
	createdBy := input.CreatedBy
	charter := &entity.RiskCharter{
		Title:          title,
		OrganizationID: input.OrganizationID,
		UPRLevel:       uprLevel,
		Period:         period,
		Status:         entity.RiskCharterStatusDraft,
		VersionGroupID: groupID,
		VersionNumber:  1,
		IsCurrent:      true,
		CreatedBy:      &createdBy,
		LegalBases:     []entity.RiskCharterLegalBasis{},
		Stakeholders:   []entity.RiskCharterStakeholder{},
		UPRStructure:   []entity.RiskCharterUPRMember{},
	}
	if err := charter.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	existing, err := uc.repo.FindExistingByOrgPeriodLevel(ctx, input.OrganizationID, period, uprLevel)
	if err != nil {
		return nil, errors.Wrap(err, "failed to find current risk charter")
	}
	if existing != nil {
		return &CreateRiskCharterOutput{Charter: existing, Existing: true}, nil
	}

	if err := uc.repo.Create(ctx, charter); err != nil {
		concurrent, findErr := uc.repo.FindExistingByOrgPeriodLevel(ctx, input.OrganizationID, period, uprLevel)
		if findErr == nil && concurrent != nil {
			return &CreateRiskCharterOutput{Charter: concurrent, Existing: true}, nil
		}
		return nil, errors.Wrap(err, "failed to create risk charter draft")
	}
	return &CreateRiskCharterOutput{Charter: charter}, nil
}
