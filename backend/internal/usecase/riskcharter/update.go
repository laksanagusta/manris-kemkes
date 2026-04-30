package riskcharter

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateRiskCharterUseCase struct {
	repo repository.RiskCharterRepository
}

func NewUpdateRiskCharterUseCase(repo repository.RiskCharterRepository) *UpdateRiskCharterUseCase {
	return &UpdateRiskCharterUseCase{repo: repo}
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
}

func (uc *UpdateRiskCharterUseCase) Execute(ctx context.Context, input UpdateRiskCharterInput) (*entity.RiskCharter, error) {
	existing, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	updated := *existing
	updated.OrganizationID = input.OrganizationID
	updated.UPRLevel = strings.TrimSpace(input.UPRLevel)
	updated.Period = strings.TrimSpace(input.Period)
	updated.RiskOwnerName = strings.TrimSpace(input.RiskOwnerName)
	updated.RiskOwnerUserID = input.RiskOwnerUserID
	updated.RiskTeamName = strings.TrimSpace(input.RiskTeamName)
	updated.Scope = strings.TrimSpace(input.Scope)
	updated.LegalBasis = strings.TrimSpace(input.LegalBasis)
	updated.InternalContext = strings.TrimSpace(input.InternalContext)
	updated.ExternalContext = strings.TrimSpace(input.ExternalContext)
	updated.StakeholderSummary = strings.TrimSpace(input.StakeholderSummary)
	updated.UPRStructure = input.UPRStructure
	updated.Status = strings.TrimSpace(input.Status)
	if len(updated.UPRStructure) == 0 {
		updated.UPRStructure = json.RawMessage("[]")
	}
	if updated.Status == "" {
		updated.Status = existing.Status
	}

	if err := updated.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	if existing.Status == "approved" {
		allowedArchiveOnly := updated.Status == "archived" &&
			existing.OrganizationID == updated.OrganizationID &&
			existing.UPRLevel == updated.UPRLevel &&
			existing.Period == updated.Period &&
			existing.RiskOwnerName == updated.RiskOwnerName &&
			uuidsEqual(existing.RiskOwnerUserID, updated.RiskOwnerUserID) &&
			existing.RiskTeamName == updated.RiskTeamName &&
			existing.Scope == updated.Scope &&
			existing.LegalBasis == updated.LegalBasis &&
			existing.InternalContext == updated.InternalContext &&
			existing.ExternalContext == updated.ExternalContext &&
			existing.StakeholderSummary == updated.StakeholderSummary &&
			string(existing.UPRStructure) == string(updated.UPRStructure)
		if !allowedArchiveOnly {
			return nil, errors.Wrap(errors.ErrInvalidInput, "approved charter can only be archived")
		}
	}

	exists, err := uc.repo.ExistsByOrgPeriodLevel(ctx, updated.OrganizationID, updated.Period, updated.UPRLevel, &updated.ID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate charter uniqueness")
	}
	if exists {
		return nil, errors.Wrap(errors.ErrInvalidInput, "risk charter already exists for organization, period, and upr level")
	}

	if err := uc.repo.Update(ctx, &updated); err != nil {
		return nil, errors.Wrap(err, "failed to update risk charter")
	}

	return &updated, nil
}

func uuidsEqual(left, right *uuid.UUID) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}
	return *left == *right
}
