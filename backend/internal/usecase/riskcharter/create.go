package riskcharter

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateRiskCharterUseCase struct {
	repo    repository.RiskCharterRepository
	orgRepo repository.OrganizationRepository
}

func NewCreateRiskCharterUseCase(repo repository.RiskCharterRepository, orgRepo repository.OrganizationRepository) *CreateRiskCharterUseCase {
	return &CreateRiskCharterUseCase{repo: repo, orgRepo: orgRepo}
}

type CreateRiskCharterInput struct {
	OrganizationID     uuid.UUID       `json:"organizationId"`
	UPRLevel           string          `json:"uprLevel"`
	Period             string          `json:"period"`
	RiskOwnerName      string          `json:"riskOwnerName"`
	RiskOwnerUserID    *uuid.UUID      `json:"riskOwnerUserId"`
	RiskTeamName       string          `json:"riskTeamName"`
	Scope              string          `json:"scope"`
	LegalBasis         string          `json:"legalBasis"`
	InternalContext    string          `json:"internalContext"`
	ExternalContext    string          `json:"externalContext"`
	StakeholderSummary string          `json:"stakeholderSummary"`
	UPRStructure       json.RawMessage `json:"uprStructure"`
	CreatedBy          *uuid.UUID      `json:"-"`
}

type CreateRiskCharterOutput struct {
	ID        uuid.UUID `json:"id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

func (uc *CreateRiskCharterUseCase) Execute(ctx context.Context, input CreateRiskCharterInput) (*CreateRiskCharterOutput, error) {
	if _, err := uc.orgRepo.GetByID(ctx, input.OrganizationID); err != nil {
		return nil, errors.Wrap(err, "organization not found")
	}
	if exists, err := uc.repo.ExistsByOrgPeriodLevel(ctx, input.OrganizationID, input.Period, input.UPRLevel, nil); err != nil {
		return nil, errors.Wrap(err, "failed to validate charter uniqueness")
	} else if exists {
		return nil, errors.Wrap(errors.ErrInvalidInput, "risk charter already exists for organization, period, and upr level")
	}

	charter := &entity.RiskCharter{
		OrganizationID:     input.OrganizationID,
		UPRLevel:           input.UPRLevel,
		Period:             input.Period,
		RiskOwnerName:      input.RiskOwnerName,
		RiskOwnerUserID:    input.RiskOwnerUserID,
		RiskTeamName:       input.RiskTeamName,
		Scope:              input.Scope,
		LegalBasis:         input.LegalBasis,
		InternalContext:    input.InternalContext,
		ExternalContext:    input.ExternalContext,
		StakeholderSummary: input.StakeholderSummary,
		UPRStructure:       input.UPRStructure,
		Status:             "draft",
		CreatedBy:          input.CreatedBy,
	}
	if err := charter.Validate(); err != nil {
		return nil, err
	}
	if err := uc.repo.Create(ctx, charter); err != nil {
		return nil, errors.Wrap(err, "failed to create risk charter")
	}
	return &CreateRiskCharterOutput{ID: charter.ID, Message: "Risk charter created successfully", CreatedAt: charter.CreatedAt}, nil
}
