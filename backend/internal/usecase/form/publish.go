package form

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type PublishFormUseCase struct {
	formRepo       repository.FormRepository
	assignmentRepo repository.FormAssignmentRepository
}

func NewPublishFormUseCase(
	formRepo repository.FormRepository,
	assignmentRepo repository.FormAssignmentRepository,
) *PublishFormUseCase {
	return &PublishFormUseCase{
		formRepo:       formRepo,
		assignmentRepo: assignmentRepo,
	}
}

type PublishFormOutput struct {
	ID     uuid.UUID
	Status string
}

func (uc *PublishFormUseCase) Execute(ctx context.Context, formID uuid.UUID) (*PublishFormOutput, error) {
	form, err := uc.formRepo.GetByID(ctx, formID)
	if err != nil {
		return nil, domainerrors.ErrFormNotFound
	}

	switch form.Status {
	case entity.FormStatusDraft:
	case entity.FormStatusPublished:
		return nil, domainerrors.ErrFormAlreadyPublished
	case entity.FormStatusClosed:
		return nil, domainerrors.ErrFormClosed
	default:
		return nil, domainerrors.ErrInvalidStatus
	}

	if err := form.ValidateForPublish(); err != nil {
		return nil, &domainerrors.AppError{
			Code:    "FORM_VALIDATION_FAILED",
			Message: err.Error(),
		}
	}

	if form.TargetAudience == "specific" {
		assignments, err := uc.assignmentRepo.GetByFormID(ctx, formID)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to check assignments")
		}
		if len(assignments) == 0 {
			return nil, &domainerrors.AppError{
				Code:    "FORM_VALIDATION_FAILED",
				Message: fmt.Sprintf("form with target audience 'specific' must have at least one organization assigned"),
			}
		}
	}

	if err := uc.formRepo.UpdateStatus(ctx, formID, entity.FormStatusPublished); err != nil {
		return nil, domainerrors.Wrap(err, "failed to publish form")
	}

	return &PublishFormOutput{
		ID:     formID,
		Status: entity.FormStatusPublished,
	}, nil
}
