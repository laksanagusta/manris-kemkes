package riskobjective

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateRiskObjectiveUseCase struct {
	repo    repository.RiskObjectiveRepository
	orgRepo repository.OrganizationRepository
}

func NewUpdateRiskObjectiveUseCase(repo repository.RiskObjectiveRepository, orgRepo repository.OrganizationRepository) *UpdateRiskObjectiveUseCase {
	return &UpdateRiskObjectiveUseCase{repo: repo, orgRepo: orgRepo}
}

type UpdateRiskObjectiveInput struct {
	ID                    uuid.UUID  `json:"-"`
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
}

type UpdateRiskObjectiveOutput struct {
	ID      uuid.UUID `json:"id"`
	Message string    `json:"message"`
}

func (uc *UpdateRiskObjectiveUseCase) Execute(ctx context.Context, input UpdateRiskObjectiveInput) (*UpdateRiskObjectiveOutput, error) {
	item, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if _, err := uc.orgRepo.GetByID(ctx, input.OrganizationID); err != nil {
		return nil, errors.Wrap(err, "organization not found")
	}
	item.OrganizationID = input.OrganizationID
	item.CharterID = input.CharterID
	item.Period = input.Period
	item.Tujuan = input.Tujuan
	item.Sasaran = input.Sasaran
	item.IndikatorKinerjaUtama = input.IndikatorKinerjaUtama
	item.Target = input.Target
	item.Program = input.Program
	item.Kegiatan = input.Kegiatan
	item.ProcessBusiness = input.ProcessBusiness
	if err := item.Validate(); err != nil {
		return nil, err
	}
	if err := uc.repo.Update(ctx, item); err != nil {
		return nil, errors.Wrap(err, "failed to update risk objective")
	}
	return &UpdateRiskObjectiveOutput{ID: item.ID, Message: "Risk objective updated successfully"}, nil
}
