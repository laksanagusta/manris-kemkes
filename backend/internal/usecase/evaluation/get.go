package evaluation

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetUseCase struct {
	repo repository.EvaluationRepository
}

func NewGetUseCase(repo repository.EvaluationRepository) *GetUseCase {
	return &GetUseCase{repo: repo}
}

type GetInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *GetUseCase) Execute(ctx context.Context, input GetInput) (*entity.Evaluation, error) {
	evaluation, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canRead(input.Scope, evaluation.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	return evaluation, nil
}
