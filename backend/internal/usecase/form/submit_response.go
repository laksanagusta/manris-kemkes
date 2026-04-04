package form

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type SubmitResponseUseCase struct {
	formRepo       repository.FormRepository
	responseRepo   repository.FormResponseRepository
	assignmentRepo repository.FormAssignmentRepository
}

func NewSubmitResponseUseCase(
	formRepo repository.FormRepository,
	responseRepo repository.FormResponseRepository,
	assignmentRepo repository.FormAssignmentRepository,
) *SubmitResponseUseCase {
	return &SubmitResponseUseCase{
		formRepo:       formRepo,
		responseRepo:   responseRepo,
		assignmentRepo: assignmentRepo,
	}
}

type SubmitResponseInput struct {
	FormID       uuid.UUID
	RespondentID uuid.UUID
	OrgID        uuid.UUID
	Answers      json.RawMessage
}

type SubmitResponseOutput struct {
	ResponseID  uuid.UUID
	SubmittedAt time.Time
}

func (uc *SubmitResponseUseCase) Execute(ctx context.Context, input SubmitResponseInput) (*SubmitResponseOutput, error) {
	form, err := uc.formRepo.GetByID(ctx, input.FormID)
	if err != nil {
		return nil, err
	}

	if !form.IsAcceptingResponses() {
		if form.Status == entity.FormStatusDraft {
			return nil, domainerrors.ErrFormNotPublished
		}
		return nil, domainerrors.ErrFormClosed
	}

	if form.TargetAudience == "specific" {
		assignedIDs, err := uc.assignmentRepo.GetFormIDsForOrganization(ctx, input.OrgID)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to check form assignment")
		}
		if !slices.Contains(assignedIDs, input.FormID) {
			return nil, domainerrors.ErrFormNotAssigned
		}
	}

	existing, err := uc.responseRepo.GetByFormAndRespondent(ctx, input.FormID, input.RespondentID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to check existing response")
	}
	if existing != nil {
		return nil, domainerrors.ErrDuplicateResponse
	}

	var answers map[string]any
	if err := json.Unmarshal(input.Answers, &answers); err != nil {
		return nil, &domainerrors.AppError{Code: "INVALID_ANSWERS", Message: "answers must be a valid JSON object"}
	}

	allFields := collectAllFields(form)
	fieldByKey := make(map[string]*entity.FormField, len(allFields))
	fieldByID := make(map[uuid.UUID]*entity.FormField, len(allFields))
	for i := range allFields {
		fieldByKey[allFields[i].FieldKey] = &allFields[i]
		fieldByID[allFields[i].ID] = &allFields[i]
	}

	visibility := evaluateVisibility(allFields, fieldByID, answers)

	for i := range allFields {
		field := &allFields[i]
		if !field.IsRequired || !visibility[field.FieldKey] {
			continue
		}
		val, exists := answers[field.FieldKey]
		if !exists || isEmpty(val) {
			return nil, &domainerrors.AppError{
				Code:    "REQUIRED_FIELD_MISSING",
				Message: fmt.Sprintf("field %q is required", field.Label),
			}
		}
	}

	for key, val := range answers {
		field, exists := fieldByKey[key]
		if !exists || !visibility[key] {
			continue
		}
		if err := validateFieldValue(field, val); err != nil {
			return nil, err
		}
	}

	response := &entity.FormResponse{
		FormID:       input.FormID,
		RespondentID: input.RespondentID,
		Answers:      input.Answers,
	}
	created, err := uc.responseRepo.Create(ctx, response)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to submit response")
	}

	return &SubmitResponseOutput{
		ResponseID:  created.ID,
		SubmittedAt: created.SubmittedAt,
	}, nil
}

func collectAllFields(form *entity.Form) []entity.FormField {
	var fields []entity.FormField
	for i := range form.Sections {
		fields = append(fields, form.Sections[i].Fields...)
	}
	return fields
}

// evaluateVisibility: no condition → visible; with condition → visible only
// when answers[sourceField.FieldKey] == conditionValue ("equals" operator only).
func evaluateVisibility(fields []entity.FormField, fieldByID map[uuid.UUID]*entity.FormField, answers map[string]any) map[string]bool {
	visible := make(map[string]bool, len(fields))
	for i := range fields {
		field := &fields[i]
		if field.ConditionSourceFieldID == nil {
			visible[field.FieldKey] = true
			continue
		}
		sourceField, exists := fieldByID[*field.ConditionSourceFieldID]
		if !exists {
			visible[field.FieldKey] = false
			continue
		}
		if field.ConditionValue == nil {
			visible[field.FieldKey] = false
			continue
		}
		answerVal, ok := answers[sourceField.FieldKey].(string)
		visible[field.FieldKey] = ok && answerVal == *field.ConditionValue
	}
	return visible
}

func isEmpty(val any) bool {
	switch v := val.(type) {
	case string:
		return v == ""
	case []any:
		return len(v) == 0
	case nil:
		return true
	default:
		return false
	}
}

func validateFieldValue(field *entity.FormField, val any) error {
	switch field.FieldType {
	case entity.FieldTypeText, entity.FieldTypeTextarea:
		if _, ok := val.(string); !ok {
			return &domainerrors.AppError{
				Code:    "INVALID_FIELD_VALUE",
				Message: fmt.Sprintf("field %q must be a string", field.Label),
			}
		}

	case entity.FieldTypeRadio, entity.FieldTypeDropdown:
		strVal, ok := val.(string)
		if !ok {
			return &domainerrors.AppError{
				Code:    "INVALID_FIELD_VALUE",
				Message: fmt.Sprintf("field %q must be a string", field.Label),
			}
		}
		if !isValidOption(field.Options, strVal) {
			return &domainerrors.AppError{
				Code:    "INVALID_OPTION",
				Message: fmt.Sprintf("field %q has invalid option %q", field.Label, strVal),
			}
		}

	case entity.FieldTypeCheckbox:
		arr, ok := val.([]any)
		if !ok {
			return &domainerrors.AppError{
				Code:    "INVALID_FIELD_VALUE",
				Message: fmt.Sprintf("field %q must be an array", field.Label),
			}
		}
		for _, item := range arr {
			strItem, ok := item.(string)
			if !ok {
				return &domainerrors.AppError{
					Code:    "INVALID_FIELD_VALUE",
					Message: fmt.Sprintf("field %q array elements must be strings", field.Label),
				}
			}
			if !isValidOption(field.Options, strItem) {
				return &domainerrors.AppError{
					Code:    "INVALID_OPTION",
					Message: fmt.Sprintf("field %q has invalid option %q", field.Label, strItem),
				}
			}
		}
	}
	return nil
}

func isValidOption(options []entity.FieldOption, value string) bool {
	for _, opt := range options {
		if opt.Value == value {
			return true
		}
	}
	return false
}
