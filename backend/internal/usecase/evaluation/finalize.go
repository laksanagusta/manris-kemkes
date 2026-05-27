package evaluation

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type FinalizeUseCase struct {
	repo repository.EvaluationRepository
}

func NewFinalizeUseCase(repo repository.EvaluationRepository) *FinalizeUseCase {
	return &FinalizeUseCase{repo: repo}
}

type FinalizeInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *FinalizeUseCase) Execute(ctx context.Context, input FinalizeInput) (*entity.Evaluation, error) {
	evaluation, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canWrite(input.Scope, evaluation.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if evaluation.Status == entity.EvaluationStatusFinal {
		return nil, errors.Wrap(errors.ErrInvalidInput, "evaluation is already final")
	}
	if err := validateEvaluationSections(evaluation.Sections); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	now := time.Now().UTC()
	evaluation.Status = entity.EvaluationStatusFinal
	evaluation.FinalizedAt = &now

	if err := uc.repo.Update(ctx, evaluation); err != nil {
		return nil, errors.Wrap(err, "failed to finalize evaluation")
	}

	return evaluation, nil
}
