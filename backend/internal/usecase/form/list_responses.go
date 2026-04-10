package form

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ListResponsesUseCase struct {
	formRepo     repository.FormRepository
	responseRepo repository.FormResponseRepository
}

func NewListResponsesUseCase(
	formRepo repository.FormRepository,
	responseRepo repository.FormResponseRepository,
) *ListResponsesUseCase {
	return &ListResponsesUseCase{
		formRepo:     formRepo,
		responseRepo: responseRepo,
	}
}

type ListResponsesInput struct {
	FormID uuid.UUID
	Scope  *entity.AccessScope
}

type ListResponsesOutput struct {
	Responses []*entity.FormResponse
}

func (uc *ListResponsesUseCase) Execute(ctx context.Context, input ListResponsesInput) (*ListResponsesOutput, error) {
	if input.Scope == nil {
		return nil, domainerrors.ErrForbidden
	}

	form, err := uc.formRepo.GetByID(ctx, input.FormID)
	if err != nil {
		return nil, err
	}

	if !input.Scope.IsGlobal {
		if form.OrganizationID == nil || !input.Scope.CanRead(*form.OrganizationID) {
			return nil, domainerrors.ErrForbidden
		}
	}

	responses, err := uc.responseRepo.GetByFormID(ctx, input.FormID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list responses")
	}

	return &ListResponsesOutput{Responses: responses}, nil
}
