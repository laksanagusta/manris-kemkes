package tmpmr

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetUseCase struct {
	repo repository.TMPMRRepository
}

func NewGetUseCase(repo repository.TMPMRRepository) *GetUseCase {
	return &GetUseCase{repo: repo}
}

type GetInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *GetUseCase) Execute(ctx context.Context, input GetInput) (*entity.TMPMRAssessment, error) {
	assessment, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessTMPMRRead(input.Scope, assessment.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	return assessment, nil
}
