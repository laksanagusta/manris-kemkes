package riskcharter

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateRiskCharterUseCase struct {
	repo    repository.RiskCharterRepository
	orgRepo repository.OrganizationRepository
}

func NewUpdateRiskCharterUseCase(repo repository.RiskCharterRepository, orgRepo repository.OrganizationRepository) *UpdateRiskCharterUseCase {
	return &UpdateRiskCharterUseCase{repo: repo, orgRepo: orgRepo}
}

type UpdateRiskCharterInput struct {
	ID                 uuid.UUID       `json:"-"`
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
	Status             string          `json:"status"`
	ApprovedBy         *uuid.UUID      `json:"approvedBy"`
}

type UpdateRiskCharterOutput struct {
	ID        uuid.UUID  `json:"id"`
	Status    string     `json:"status"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
	Message   string     `json:"message"`
}

func (uc *UpdateRiskCharterUseCase) Execute(ctx context.Context, input UpdateRiskCharterInput) (*UpdateRiskCharterOutput, error) {
	existing, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if _, err := uc.orgRepo.GetByID(ctx, input.OrganizationID); err != nil {
		return nil, errors.Wrap(err, "organization not found")
	}
	if existing.Status == "approved" && input.Status != "approved" && input.Status != "archived" {
		return nil, errors.Wrap(errors.ErrInvalidInput, "approved risk charter can only be archived")
	}
	if exists, err := uc.repo.ExistsByOrgPeriodLevel(ctx, input.OrganizationID, input.Period, input.UPRLevel, &input.ID); err != nil {
		return nil, errors.Wrap(err, "failed to validate charter uniqueness")
	} else if exists {
		return nil, errors.Wrap(errors.ErrInvalidInput, "risk charter already exists for organization, period, and upr level")
	}

	existing.OrganizationID = input.OrganizationID
	existing.UPRLevel = input.UPRLevel
	existing.Period = input.Period
	existing.RiskOwnerName = input.RiskOwnerName
	existing.RiskOwnerUserID = input.RiskOwnerUserID
	existing.RiskTeamName = input.RiskTeamName
	existing.Scope = input.Scope
	existing.LegalBasis = input.LegalBasis
	existing.InternalContext = input.InternalContext
	existing.ExternalContext = input.ExternalContext
	existing.StakeholderSummary = input.StakeholderSummary
	existing.UPRStructure = input.UPRStructure
	existing.Status = input.Status
	existing.ApprovedBy = input.ApprovedBy
	if input.Status == "approved" {
		now := time.Now().UTC()
		existing.ApprovedAt = &now
	} else if input.Status != "archived" {
		existing.ApprovedAt = nil
		existing.ApprovedBy = nil
	}
	if err := existing.Validate(); err != nil {
		return nil, err
	}
	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, errors.Wrap(err, "failed to update risk charter")
	}
	return &UpdateRiskCharterOutput{ID: existing.ID, Status: existing.Status, UpdatedAt: &existing.UpdatedAt, Message: "Risk charter updated successfully"}, nil
}
