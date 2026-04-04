package form

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type DeleteFormUseCase struct {
	formRepo repository.FormRepository
}

func NewDeleteFormUseCase(formRepo repository.FormRepository) *DeleteFormUseCase {
	return &DeleteFormUseCase{formRepo: formRepo}
}

type DeleteFormOutput struct {
	Message string
}

func (uc *DeleteFormUseCase) Execute(ctx context.Context, formID uuid.UUID) (*DeleteFormOutput, error) {
	form, err := uc.formRepo.GetByID(ctx, formID)
	if err != nil {
		return nil, domainerrors.ErrFormNotFound
	}

	if form.Status != entity.FormStatusDraft {
		return nil, domainerrors.ErrFormLocked
	}

	if err := uc.formRepo.Delete(ctx, formID); err != nil {
		return nil, domainerrors.Wrap(err, "failed to delete form")
	}

	return &DeleteFormOutput{Message: "Form deleted successfully"}, nil
}
