package riskcharter

import (
	"context"
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
	ID              uuid.UUID                       `json:"-"`
	Title           string                          `json:"title"`
	Scope           string                          `json:"scope"`
	LegalBases      []entity.RiskCharterLegalBasis  `json:"legalBases"`
	InternalContext string                          `json:"internalContext"`
	ExternalContext string                          `json:"externalContext"`
	Stakeholders    []entity.RiskCharterStakeholder `json:"stakeholders"`
	UPRStructure    []entity.RiskCharterUPRMember   `json:"uprStructure"`
	AccessScope     *entity.AccessScope             `json:"-"`
}

func (uc *UpdateRiskCharterUseCase) Execute(ctx context.Context, input UpdateRiskCharterInput) (*entity.RiskCharter, error) {
	existing, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessRiskCharter(input.AccessScope, existing.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if existing.Status != entity.RiskCharterStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidInput, "piagam final hanya dapat dibaca; buat revisi untuk mengubahnya")
	}

	updated := *existing
	updated.Title = strings.TrimSpace(input.Title)
	updated.Scope = strings.TrimSpace(input.Scope)
	updated.LegalBases = input.LegalBases
	updated.InternalContext = strings.TrimSpace(input.InternalContext)
	updated.ExternalContext = strings.TrimSpace(input.ExternalContext)
	updated.Stakeholders = input.Stakeholders
	updated.UPRStructure = input.UPRStructure
	updated.LegalBasis = joinLegalBases(input.LegalBases)
	updated.StakeholderSummary = joinStakeholders(input.Stakeholders)
	if err := updated.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}
	if err := uc.repo.UpdateDraft(ctx, &updated); err != nil {
		return nil, errors.Wrap(err, "failed to update risk charter draft")
	}
	return &updated, nil
}

func joinLegalBases(items []entity.RiskCharterLegalBasis) string {
	parts := make([]string, 0, len(items))
	for _, item := range items {
		part := strings.TrimSpace(item.Reference)
		if provision := strings.TrimSpace(item.Provision); provision != "" {
			part += " — " + provision
		}
		if part != "" {
			parts = append(parts, part)
		}
	}
	return strings.Join(parts, "\n")
}

func joinStakeholders(items []entity.RiskCharterStakeholder) string {
	parts := make([]string, 0, len(items))
	for _, item := range items {
		name := strings.TrimSpace(item.Name)
		relationship := strings.TrimSpace(item.Relationship)
		if name != "" && relationship != "" {
			parts = append(parts, name+" — "+relationship)
		} else if name != "" {
			parts = append(parts, name)
		}
	}
	return strings.Join(parts, "\n")
}
