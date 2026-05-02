package riskcascade

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateBottomUpUseCase struct {
	cascadeRepo repository.RiskCascadeRepository
	riskRepo    repository.RiskRepository
	orgRepo     repository.OrganizationRepository
}

type CreateBottomUpInput struct {
	SourceRiskID  uuid.UUID `json:"sourceRiskId"`
	TargetOrgID   uuid.UUID `json:"targetOrgId"`
	AnalysisNote  string    `json:"analysisNote"`
	CreatedBy     uuid.UUID `json:"-"`
	CreatedByName string    `json:"-"`
	OrgIDs        []uuid.UUID
}

func NewCreateBottomUpUseCase(
	cascadeRepo repository.RiskCascadeRepository,
	riskRepo repository.RiskRepository,
	orgRepo repository.OrganizationRepository,
) *CreateBottomUpUseCase {
	return &CreateBottomUpUseCase{cascadeRepo: cascadeRepo, riskRepo: riskRepo, orgRepo: orgRepo}
}

func (uc *CreateBottomUpUseCase) Execute(ctx context.Context, input CreateBottomUpInput) (*entity.RiskCascade, error) {
	mandatoryUC := &CreateMandatoryUseCase{
		cascadeRepo: uc.cascadeRepo,
		riskRepo:    uc.riskRepo,
		orgRepo:     uc.orgRepo,
	}
	return mandatoryUC.create(ctx, CreateMandatoryInput{
		SourceRiskID: input.SourceRiskID,
		TargetOrgID:  input.TargetOrgID,
		AnalysisNote: input.AnalysisNote,
		CreatedBy:    input.CreatedBy,
		OrgIDs:       input.OrgIDs,
	}, "bottom_up_escalation", true)
}
