package form

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CloseFormUseCase struct {
	formRepo repository.FormRepository
}

func NewCloseFormUseCase(formRepo repository.FormRepository) *CloseFormUseCase {
	return &CloseFormUseCase{formRepo: formRepo}
}

type CloseFormInput struct {
	FormID uuid.UUID
	Scope  *entity.AccessScope
}

type CloseFormOutput struct {
	ID     uuid.UUID
	Status string
}

func (uc *CloseFormUseCase) Execute(ctx context.Context, input CloseFormInput) (*CloseFormOutput, error) {
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

	switch form.Status {
	case entity.FormStatusPublished:
	case entity.FormStatusClosed:
		return nil, domainerrors.ErrFormClosed
	case entity.FormStatusDraft:
		return nil, domainerrors.ErrFormNotPublished
	default:
		return nil, domainerrors.ErrInvalidStatus
	}

	if err := uc.formRepo.UpdateStatus(ctx, input.FormID, entity.FormStatusClosed); err != nil {
		return nil, domainerrors.Wrap(err, "failed to close form")
	}

	return &CloseFormOutput{
		ID:     input.FormID,
		Status: entity.FormStatusClosed,
	}, nil
}
