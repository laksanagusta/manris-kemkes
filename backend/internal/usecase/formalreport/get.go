package formalreport

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetUseCase struct {
	repo repository.FormalReportRepository
}

func NewGetUseCase(repo repository.FormalReportRepository) *GetUseCase {
	return &GetUseCase{repo: repo}
}

type GetInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *GetUseCase) Execute(ctx context.Context, input GetInput) (*entity.FormalReport, error) {
	report, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if err := validateFormalReportAccess(input.Scope, report.OrganizationID, false); err != nil {
		return nil, errors.ErrForbidden
	}
	return report, nil
}
