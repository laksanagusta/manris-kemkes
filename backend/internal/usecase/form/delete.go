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

type DeleteFormInput struct {
	FormID uuid.UUID
	Scope  *entity.AccessScope
}

type DeleteFormOutput struct {
	Message string
}

func (uc *DeleteFormUseCase) Execute(ctx context.Context, input DeleteFormInput) (*DeleteFormOutput, error) {
	if input.Scope == nil {
		return nil, domainerrors.ErrForbidden
	}

	form, err := uc.formRepo.GetByID(ctx, input.FormID)
	if err != nil {
		return nil, domainerrors.ErrFormNotFound
	}

	if !input.Scope.IsGlobal {
		if form.OrganizationID == nil || !input.Scope.CanWrite(*form.OrganizationID) {
			return nil, domainerrors.ErrForbidden
		}
	}

	if form.Status != entity.FormStatusDraft {
		return nil, domainerrors.ErrFormLocked
	}

	if err := uc.formRepo.Delete(ctx, input.FormID); err != nil {
		return nil, domainerrors.Wrap(err, "failed to delete form")
	}

	return &DeleteFormOutput{Message: "Form deleted successfully"}, nil
}
