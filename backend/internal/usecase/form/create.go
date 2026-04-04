package form

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateFormUseCase struct {
	formRepo       repository.FormRepository
	assignmentRepo repository.FormAssignmentRepository
}

func NewCreateFormUseCase(
	formRepo repository.FormRepository,
	assignmentRepo repository.FormAssignmentRepository,
) *CreateFormUseCase {
	return &CreateFormUseCase{
		formRepo:       formRepo,
		assignmentRepo: assignmentRepo,
	}
}

type CreateFormInput struct {
	Title           string
	Description     *string
	Sections        []SectionInput
	TargetAudience  string
	OrganizationIDs []uuid.UUID
	CreatedBy       uuid.UUID
}

type CreateFormOutput struct {
	ID        uuid.UUID
	Status    string
	CreatedAt time.Time
}

func (uc *CreateFormUseCase) Execute(ctx context.Context, input CreateFormInput) (*CreateFormOutput, error) {
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

	formID := uuid.New()
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
				FormID:                 formID,
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
			FormID:      formID,
			Title:       si.Title,
			Description: si.Description,
			Position:    si.Position,
			Fields:      fields,
			CreatedAt:   now,
		})
	}

	form := &entity.Form{
		ID:             formID,
		Title:          input.Title,
		Description:    input.Description,
		Status:         entity.FormStatusDraft,
		TargetAudience: input.TargetAudience,
		CreatedBy:      input.CreatedBy,
		Sections:       sections,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	created, err := uc.formRepo.Create(ctx, form)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to create form")
	}

	if input.TargetAudience == "specific" && len(input.OrganizationIDs) > 0 {
		if err := uc.assignmentRepo.SetAssignments(ctx, formID, input.OrganizationIDs); err != nil {
			return nil, domainerrors.Wrap(err, "failed to set form assignments")
		}
	}

	return &CreateFormOutput{
		ID:        created.ID,
		Status:    created.Status,
		CreatedAt: created.CreatedAt,
	}, nil
}
