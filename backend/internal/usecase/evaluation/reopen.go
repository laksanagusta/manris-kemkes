package evaluation

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ReopenUseCase struct {
	repo repository.EvaluationRepository
}

func NewReopenUseCase(repo repository.EvaluationRepository) *ReopenUseCase {
	return &ReopenUseCase{repo: repo}
}

type ReopenInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *ReopenUseCase) Execute(ctx context.Context, input ReopenInput) (*entity.Evaluation, error) {
	evaluation, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canWrite(input.Scope, evaluation.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if evaluation.Status != entity.EvaluationStatusFinal {
		return nil, errors.Wrap(errors.ErrInvalidInput, "only final evaluations can be reopened")
	}

	evaluation.Status = entity.EvaluationStatusDraft
	evaluation.FinalizedAt = nil

	if err := uc.repo.Update(ctx, evaluation); err != nil {
		return nil, errors.Wrap(err, "failed to reopen evaluation")
	}

	return evaluation, nil
}
