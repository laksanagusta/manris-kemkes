package tmpmr

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ReviewUseCase struct {
	repo repository.TMPMRRepository
}

func NewReviewUseCase(repo repository.TMPMRRepository) *ReviewUseCase {
	return &ReviewUseCase{repo: repo}
}

type ReviewInput struct {
	ID         uuid.UUID  `json:"-"`
	ReviewerID *uuid.UUID `json:"reviewerId"`
	ReviewNote string     `json:"reviewNote"`
	Scope      *entity.AccessScope
}

func (uc *ReviewUseCase) Execute(ctx context.Context, input ReviewInput) (*entity.TMPMRAssessment, error) {
	assessment, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessTMPMRWrite(input.Scope, assessment.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if assessment.Status != entity.TMPMRStatusSubmitted {
		return nil, errors.Wrap(errors.ErrInvalidInput, "only submitted tmpmr assessments can be reviewed")
	}

	assessment.Status = entity.TMPMRStatusReviewed
	assessment.ReviewerID = input.ReviewerID
	assessment.ReviewNote = strings.TrimSpace(input.ReviewNote)
	scoreTMPMRAssessment(assessment)

	if err := uc.repo.Update(ctx, assessment); err != nil {
		return nil, errors.Wrap(err, "failed to review tmpmr assessment")
	}

	return assessment, nil
}
