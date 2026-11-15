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
		return nil, errors.ErrEvaluationAlreadyFinal
	}
	if err := validateEvaluationSections(evaluation.Sections); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	if evaluation.MonitoringPeriodID != nil {
		total := 0
		for _, section := range evaluation.Sections {
			for _, item := range section.Items {
				total++
				if item.Answer != entity.EvaluationAnswerYes && item.Answer != entity.EvaluationAnswerNo {
					return nil, errors.Wrap(errors.ErrInvalidInput, "Jawab setiap butir evaluasi sebelum finalisasi.")
				}
			}
		}
		if total == 0 {
			return nil, errors.Wrap(errors.ErrInvalidInput, "Evaluasi belum memiliki butir penilaian.")
		}
	}
	now := time.Now().UTC()
	evaluation.Status = entity.EvaluationStatusFinal
	evaluation.FinalizedAt = &now

	if err := uc.repo.Update(ctx, evaluation); err != nil {
		return nil, errors.Wrap(err, "failed to finalize evaluation")
	}

	return evaluation, nil
}
