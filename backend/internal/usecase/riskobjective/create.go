package riskobjective

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateRiskObjectiveUseCase struct {
	repo    repository.RiskObjectiveRepository
	orgRepo repository.OrganizationRepository
}

func NewCreateRiskObjectiveUseCase(repo repository.RiskObjectiveRepository, orgRepo repository.OrganizationRepository) *CreateRiskObjectiveUseCase {
	return &CreateRiskObjectiveUseCase{repo: repo, orgRepo: orgRepo}
}

type CreateRiskObjectiveInput struct {
	OrganizationID        uuid.UUID  `json:"organizationId"`
	CharterID             *uuid.UUID `json:"charterId"`
	Period                string     `json:"period"`
	Tujuan                string     `json:"tujuan"`
	Sasaran               string     `json:"sasaran"`
	IndikatorKinerjaUtama string     `json:"indikatorKinerjaUtama"`
	Target                string     `json:"target"`
	Program               string     `json:"program"`
	Kegiatan              string     `json:"kegiatan"`
	ProcessBusiness       string     `json:"processBusiness"`
	CreatedBy             *uuid.UUID `json:"-"`
}

type CreateRiskObjectiveOutput struct {
	ID        uuid.UUID `json:"id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

func (uc *CreateRiskObjectiveUseCase) Execute(ctx context.Context, input CreateRiskObjectiveInput) (*CreateRiskObjectiveOutput, error) {
	if _, err := uc.orgRepo.GetByID(ctx, input.OrganizationID); err != nil {
		return nil, errors.Wrap(err, "organization not found")
	}
	objective := &entity.RiskObjective{
		OrganizationID:        input.OrganizationID,
		CharterID:             input.CharterID,
		Period:                input.Period,
		Tujuan:                input.Tujuan,
		Sasaran:               input.Sasaran,
		IndikatorKinerjaUtama: input.IndikatorKinerjaUtama,
		Target:                input.Target,
		Program:               input.Program,
		Kegiatan:              input.Kegiatan,
		ProcessBusiness:       input.ProcessBusiness,
		CreatedBy:             input.CreatedBy,
	}
	if err := objective.Validate(); err != nil {
		return nil, err
	}
	if err := uc.repo.Create(ctx, objective); err != nil {
		return nil, errors.Wrap(err, "failed to create risk objective")
	}
	return &CreateRiskObjectiveOutput{ID: objective.ID, Message: "Risk objective created successfully", CreatedAt: objective.CreatedAt}, nil
}
