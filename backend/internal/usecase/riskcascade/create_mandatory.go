package riskcascade

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateMandatoryUseCase struct {
	cascadeRepo repository.RiskCascadeRepository
	riskRepo    repository.RiskRepository
	orgRepo     repository.OrganizationRepository
}

type CreateMandatoryInput struct {
	SourceRiskID  uuid.UUID `json:"sourceRiskId"`
	TargetOrgID   uuid.UUID `json:"targetOrgId"`
	AnalysisNote  string    `json:"analysisNote"`
	CreatedBy     uuid.UUID `json:"-"`
	CreatedByName string    `json:"-"`
	OrgIDs        []uuid.UUID
}

func NewCreateMandatoryUseCase(
	cascadeRepo repository.RiskCascadeRepository,
	riskRepo repository.RiskRepository,
	orgRepo repository.OrganizationRepository,
) *CreateMandatoryUseCase {
	return &CreateMandatoryUseCase{cascadeRepo: cascadeRepo, riskRepo: riskRepo, orgRepo: orgRepo}
}

func (uc *CreateMandatoryUseCase) Execute(ctx context.Context, input CreateMandatoryInput) (*entity.RiskCascade, error) {
	return uc.create(ctx, input, "mandatory_top_down", false)
}

func (uc *CreateMandatoryUseCase) create(ctx context.Context, input CreateMandatoryInput, cascadeType string, allowTargetOutsideScope bool) (*entity.RiskCascade, error) {
	if input.SourceRiskID == uuid.Nil || input.TargetOrgID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, input.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if sourceRisk.OrganizationID == nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "source risk must belong to an organization")
	}
	if sourceRisk.Status != entity.RiskStatusApproved || !sourceRisk.IsCurrent {
		return nil, errors.Wrap(errors.ErrInvalidInput, "only active approved risks can be escalated")
	}
	if sourceRisk.HasOngoing {
		return nil, errors.Wrap(errors.ErrInvalidInput, "risk with ongoing monitoring draft cannot be escalated")
	}

	if _, err := uc.orgRepo.GetByID(ctx, input.TargetOrgID); err != nil {
		return nil, errors.Wrap(err, "target organization not found")
	}
	if !allowTargetOutsideScope && !isOrgAccessible(input.TargetOrgID, input.OrgIDs) {
		return nil, errors.ErrForbidden
	}

	cascade := &entity.RiskCascade{
		SourceRiskID: input.SourceRiskID,
		SourceOrgID:  *sourceRisk.OrganizationID,
		TargetOrgID:  input.TargetOrgID,
		CascadeType:  cascadeType,
		Status:       "proposed",
		AnalysisNote: strings.TrimSpace(input.AnalysisNote),
		ProposedBy:   &input.CreatedBy,
	}

	if err := cascade.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	if err := uc.cascadeRepo.Create(ctx, cascade); err != nil {
		return nil, errors.Wrap(err, "failed to create risk cascade")
	}

	cascade.SourceRiskCode = sourceRisk.Code
	cascade.SourceRiskTitle = sourceRisk.Title
	return cascade, nil
}
