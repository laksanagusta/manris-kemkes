package riskobjective

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateRiskObjectiveUseCase struct {
	repo repository.RiskObjectiveRepository
}

func NewCreateRiskObjectiveUseCase(repo repository.RiskObjectiveRepository) *CreateRiskObjectiveUseCase {
	return &CreateRiskObjectiveUseCase{repo: repo}
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
	Status                string     `json:"status"`
	CreatedBy             *uuid.UUID `json:"-"`
}

func (uc *CreateRiskObjectiveUseCase) Execute(ctx context.Context, input CreateRiskObjectiveInput) (*entity.RiskObjective, error) {
	objective := &entity.RiskObjective{
		OrganizationID:        input.OrganizationID,
		CharterID:             input.CharterID,
		Period:                strings.TrimSpace(input.Period),
		Tujuan:                strings.TrimSpace(input.Tujuan),
		Sasaran:               strings.TrimSpace(input.Sasaran),
		IndikatorKinerjaUtama: strings.TrimSpace(input.IndikatorKinerjaUtama),
		Target:                strings.TrimSpace(input.Target),
		Program:               strings.TrimSpace(input.Program),
		Kegiatan:              strings.TrimSpace(input.Kegiatan),
		ProcessBusiness:       strings.TrimSpace(input.ProcessBusiness),
		Status:                strings.TrimSpace(input.Status),
		CreatedBy:             input.CreatedBy,
	}

	if err := objective.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	if err := uc.repo.Create(ctx, objective); err != nil {
		return nil, errors.Wrap(err, "failed to create risk objective")
	}

	return objective, nil
}
