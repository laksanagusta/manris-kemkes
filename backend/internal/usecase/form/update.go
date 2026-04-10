package form

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateFormUseCase struct {
	formRepo       repository.FormRepository
	assignmentRepo repository.FormAssignmentRepository
}

func NewUpdateFormUseCase(
	formRepo repository.FormRepository,
	assignmentRepo repository.FormAssignmentRepository,
) *UpdateFormUseCase {
	return &UpdateFormUseCase{
		formRepo:       formRepo,
		assignmentRepo: assignmentRepo,
	}
}

type UpdateFormInput struct {
	FormID          uuid.UUID
	UpdaterID       uuid.UUID
	Scope           *entity.AccessScope
	Title           string
	Description     *string
	Sections        []SectionInput
	TargetAudience  string
	OrganizationIDs []uuid.UUID
}

type UpdateFormOutput struct {
	ID        uuid.UUID
	Status    string
	UpdatedAt time.Time
}

func (uc *UpdateFormUseCase) Execute(ctx context.Context, input UpdateFormInput) (*UpdateFormOutput, error) {
	if input.Scope == nil {
		return nil, domainerrors.ErrForbidden
	}

	existing, err := uc.formRepo.GetByID(ctx, input.FormID)
	if err != nil {
		return nil, domainerrors.ErrFormNotFound
	}

	if !input.Scope.IsGlobal {
		if existing.OrganizationID == nil || !input.Scope.CanWrite(*existing.OrganizationID) {
			return nil, domainerrors.ErrForbidden
		}
	}

	if existing.Status != entity.FormStatusDraft {
		return nil, domainerrors.ErrFormLocked
	}

	hasResponses, err := uc.formRepo.HasResponses(ctx, input.FormID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to check responses")
	}
	if hasResponses {
		return nil, domainerrors.ErrFormLocked
	}

	if input.Title == "" {
		return nil, domainerrors.ErrInvalidFormTitle
	}
	if len(input.Sections) == 0 {
		return nil, domainerrors.ErrEmptySection
	}
	for _, s := range input.Sections {
		if len(s.Fields) == 0 {
			return nil, domainerrors.ErrEmptySection
		}
	}

	assignFieldKeys(input.Sections)

	now := time.Now()
	sections := make([]entity.FormSection, 0, len(input.Sections))
	for i, si := range input.Sections {
		sectionID := uuid.New()
		fields := make([]entity.FormField, 0, len(si.Fields))
		for j, fi := range si.Fields {
			options := make([]entity.FieldOption, 0, len(fi.Options))
			for _, oi := range fi.Options {
				options = append(options, entity.FieldOption{
					Value: oi.Value,
					Label: oi.Label,
				})
			}
			fields = append(fields, entity.FormField{
				ID:                     uuid.New(),
				SectionID:              sectionID,
				FormID:                 input.FormID,
				FieldType:              fi.FieldType,
				FieldKey:               input.Sections[i].Fields[j].fieldKey,
				Label:                  fi.Label,
				Placeholder:            fi.Placeholder,
				IsRequired:             fi.IsRequired,
				Options:                options,
				Position:               fi.Position,
				ConditionSourceFieldID: fi.ConditionSourceFieldID,
				ConditionValue:         fi.ConditionValue,
				CreatedAt:              now,
			})
		}
		sections = append(sections, entity.FormSection{
			ID:          sectionID,
			FormID:      input.FormID,
			Title:       si.Title,
			Description: si.Description,
			Position:    si.Position,
			Fields:      fields,
			CreatedAt:   now,
		})
	}

	existing.Title = input.Title
	existing.Description = input.Description
	existing.TargetAudience = input.TargetAudience
	existing.Sections = sections
	existing.UpdatedAt = now

	updated, err := uc.formRepo.Update(ctx, existing)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to update form")
	}

	if input.TargetAudience == "specific" && len(input.OrganizationIDs) > 0 {
		if err := uc.assignmentRepo.SetAssignments(ctx, input.FormID, input.OrganizationIDs); err != nil {
			return nil, domainerrors.Wrap(err, "failed to update form assignments")
		}
	}

	return &UpdateFormOutput{
		ID:        updated.ID,
		Status:    updated.Status,
		UpdatedAt: updated.UpdatedAt,
	}, nil
}
