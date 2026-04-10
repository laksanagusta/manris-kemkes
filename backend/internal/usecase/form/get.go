package form

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GetFormUseCase struct {
	formRepo       repository.FormRepository
	assignmentRepo repository.FormAssignmentRepository
}

func NewGetFormUseCase(
	formRepo repository.FormRepository,
	assignmentRepo repository.FormAssignmentRepository,
) *GetFormUseCase {
	return &GetFormUseCase{
		formRepo:       formRepo,
		assignmentRepo: assignmentRepo,
	}
}

type GetFormInput struct {
	FormID uuid.UUID
	Scope  *entity.AccessScope
}

func (uc *GetFormUseCase) Execute(ctx context.Context, input GetFormInput) (*entity.Form, error) {
	if input.Scope == nil {
		return nil, domainerrors.ErrForbidden
	}

	form, err := uc.formRepo.GetByID(ctx, input.FormID)
	if err != nil {
		return nil, domainerrors.ErrFormNotFound
	}

	if input.Scope.IsGlobal {
		return form, nil
	}

	if form.OrganizationID != nil {
		for _, orgID := range input.Scope.AccessibleOrgIDs {
			if *form.OrganizationID == orgID {
				return form, nil
			}
		}
	}

	if form.Status != entity.FormStatusPublished {
		return nil, domainerrors.ErrFormNotFound
	}

	if form.TargetAudience == "all" {
		return form, nil
	}

	if input.Scope.OrganizationID == nil {
		return nil, domainerrors.ErrFormNotAssigned
	}

	for _, orgID := range input.Scope.AccessibleOrgIDs {
		assignedFormIDs, err := uc.assignmentRepo.GetFormIDsForOrganization(ctx, orgID)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to check form assignments")
		}
		for _, fid := range assignedFormIDs {
			if fid == input.FormID {
				return form, nil
			}
		}
	}

	return nil, domainerrors.ErrFormNotAssigned
}
