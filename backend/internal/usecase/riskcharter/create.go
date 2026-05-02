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
	OrganizationID     uuid.UUID  `json:"organizationId"`
	UPRLevel           string     `json:"uprLevel"`
	Period             string     `json:"period"`
	RiskOwnerName      string     `json:"riskOwnerName"`
	RiskOwnerUserID    *uuid.UUID `json:"riskOwnerUserId"`
	RiskTeamName       string     `json:"riskTeamName"`
	Scope              string     `json:"scope"`
	LegalBasis         string     `json:"legalBasis"`
	InternalContext    string     `json:"internalContext"`
	ExternalContext    string     `json:"externalContext"`
	StakeholderSummary string     `json:"stakeholderSummary"`
	Status             string     `json:"status"`
	CreatedBy          *uuid.UUID `json:"-"`
}

func (uc *CreateRiskCharterUseCase) Execute(ctx context.Context, input CreateRiskCharterInput) (*entity.RiskCharter, error) {
	charter := &entity.RiskCharter{
		OrganizationID:     input.OrganizationID,
		UPRLevel:           strings.TrimSpace(input.UPRLevel),
		Period:             strings.TrimSpace(input.Period),
		RiskOwnerName:      strings.TrimSpace(input.RiskOwnerName),
		RiskOwnerUserID:    input.RiskOwnerUserID,
		RiskTeamName:       strings.TrimSpace(input.RiskTeamName),
		Scope:              strings.TrimSpace(input.Scope),
		LegalBasis:         strings.TrimSpace(input.LegalBasis),
		InternalContext:    strings.TrimSpace(input.InternalContext),
		ExternalContext:    strings.TrimSpace(input.ExternalContext),
		StakeholderSummary: strings.TrimSpace(input.StakeholderSummary),
		Status:             strings.TrimSpace(input.Status),
		CreatedBy:          input.CreatedBy,
	}

	if err := charter.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	exists, err := uc.repo.ExistsByOrgPeriodLevel(ctx, charter.OrganizationID, charter.Period, charter.UPRLevel, nil)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate charter uniqueness")
	}
	if exists {
		return nil, errors.Wrap(errors.ErrInvalidInput, "risk charter already exists for organization, period, and upr level")
	}

	if err := uc.repo.Create(ctx, charter); err != nil {
		return nil, errors.Wrap(err, "failed to create risk charter")
	}

	return charter, nil
}
