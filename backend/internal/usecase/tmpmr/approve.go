package tmpmr

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ApproveUseCase struct {
	repo repository.TMPMRRepository
}

func NewApproveUseCase(repo repository.TMPMRRepository) *ApproveUseCase {
	return &ApproveUseCase{repo: repo}
}

type ApproveInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *ApproveUseCase) Execute(ctx context.Context, input ApproveInput) (*entity.TMPMRAssessment, error) {
	assessment, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessTMPMRWrite(input.Scope, assessment.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if assessment.Status != entity.TMPMRStatusReviewed {
		return nil, errors.ErrOnlyReviewedTMPMRApproved
	}

	assessment.Status = entity.TMPMRStatusApproved
	scoreTMPMRAssessment(assessment)

	if err := uc.repo.Update(ctx, assessment); err != nil {
		return nil, errors.Wrap(err, "failed to approve tmpmr assessment")
	}

	return assessment, nil
}
