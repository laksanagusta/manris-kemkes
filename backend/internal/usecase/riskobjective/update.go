package riskobjective

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateRiskObjectiveUseCase struct {
	repo repository.RiskObjectiveRepository
}

func NewUpdateRiskObjectiveUseCase(repo repository.RiskObjectiveRepository) *UpdateRiskObjectiveUseCase {
	return &UpdateRiskObjectiveUseCase{repo: repo}
}

type UpdateRiskObjectiveInput struct {
	ID                    uuid.UUID  `json:"-"`
	OrganizationID        uuid.UUID  `json:"organizationId"`
	CharterID            *uuid.UUID `json:"charterId"`
	Period                string     `json:"period"`
	Tujuan                string     `json:"tujuan"`
	Sasaran               string     `json:"sasaran"`
	IndikatorKinerjaUtama string     `json:"indikatorKinerjaUtama"`
	Target                string     `json:"target"`
	Program               string     `json:"program"`
	Kegiatan              string     `json:"kegiatan"`
	ProcessBusiness       string     `json:"processBusiness"`
}

func (uc *UpdateRiskObjectiveUseCase) Execute(ctx context.Context, input UpdateRiskObjectiveInput) (*entity.RiskObjective, error) {
	existing, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	updated := *existing
	updated.OrganizationID = input.OrganizationID
	updated.CharterID = input.CharterID
	updated.Period = strings.TrimSpace(input.Period)
	updated.Tujuan = strings.TrimSpace(input.Tujuan)
	updated.Sasaran = strings.TrimSpace(input.Sasaran)
	updated.IndikatorKinerjaUtama = strings.TrimSpace(input.IndikatorKinerjaUtama)
	updated.Target = strings.TrimSpace(input.Target)
	updated.Program = strings.TrimSpace(input.Program)
	updated.Kegiatan = strings.TrimSpace(input.Kegiatan)
	updated.ProcessBusiness = strings.TrimSpace(input.ProcessBusiness)

	if err := updated.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	if err := uc.repo.Update(ctx, &updated); err != nil {
		return nil, errors.Wrap(err, "failed to update risk objective")
	}

	return &updated, nil
}