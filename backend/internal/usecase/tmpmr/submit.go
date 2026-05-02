package tmpmr

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type SubmitUseCase struct {
	repo repository.TMPMRRepository
}

func NewSubmitUseCase(repo repository.TMPMRRepository) *SubmitUseCase {
	return &SubmitUseCase{repo: repo}
}

type SubmitInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *SubmitUseCase) Execute(ctx context.Context, input SubmitInput) (*entity.TMPMRAssessment, error) {
	assessment, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessTMPMRWrite(input.Scope, assessment.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if assessment.Status != entity.TMPMRStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidInput, "only draft tmpmr assessments can be submitted")
	}
	for _, item := range assessment.Items {
		if item.Score <= 0 {
			return nil, errors.Wrap(errors.ErrInvalidInput, "all tmpmr items must have a score before submission")
		}
	}

	assessment.Status = entity.TMPMRStatusSubmitted
	scoreTMPMRAssessment(assessment)

	if err := uc.repo.Update(ctx, assessment); err != nil {
		return nil, errors.Wrap(err, "failed to submit tmpmr assessment")
	}

	return assessment, nil
}
