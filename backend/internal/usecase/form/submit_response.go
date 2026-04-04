package form

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// SubmitResponseUseCase handles form response submission with server-side
// conditional visibility evaluation and field validation.
type SubmitResponseUseCase struct {
	formRepo       repository.FormRepository
	responseRepo   repository.FormResponseRepository
	assignmentRepo repository.FormAssignmentRepository
}

// NewSubmitResponseUseCase creates a new SubmitResponseUseCase.
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

// SubmitResponseInput holds the data required to submit a form response.
type SubmitResponseInput struct {
	FormID       uuid.UUID
	RespondentID uuid.UUID
	OrgID        uuid.UUID       // for assignment check
	Answers      json.RawMessage // JSONB: {"field_key": value}
}

// SubmitResponseOutput holds the result of a successful submission.
type SubmitResponseOutput struct {
	ResponseID  uuid.UUID
	SubmittedAt time.Time
}

// Execute validates and persists a form response.
func (uc *SubmitResponseUseCase) Execute(ctx context.Context, input SubmitResponseInput) (*SubmitResponseOutput, error) {
	// 1. Fetch full form (with sections and fields).
	form, err := uc.formRepo.GetByID(ctx, input.FormID)
	if err != nil {
		return nil, err // ErrFormNotFound propagated from repository
	}

	// 2. Check the form is accepting responses.
	if !form.IsAcceptingResponses() {
		if form.Status == entity.FormStatusDraft {
			return nil, domainerrors.ErrFormNotPublished
		}
		return nil, domainerrors.ErrFormClosed
	}

	// 3. If targeted to specific organisations, verify assignment.
	if form.TargetAudience == "specific" {
		assignedIDs, err := uc.assignmentRepo.GetFormIDsForOrganization(ctx, input.OrgID)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to check form assignment")
		}
		assigned := false
		for _, id := range assignedIDs {
			if id == input.FormID {
				assigned = true
				break
			}
		}
		if !assigned {
			return nil, domainerrors.ErrFormNotAssigned
		}
	}

	// 4. Check duplicate (one response per user per form).
	existing, err := uc.responseRepo.GetByFormAndRespondent(ctx, input.FormID, input.RespondentID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to check existing response")
	}
	if existing != nil {
		return nil, domainerrors.ErrDuplicateResponse
	}

	// 5. Parse answers from JSON into a map.
	var answers map[string]interface{}
	if err := json.Unmarshal(input.Answers, &answers); err != nil {
		return nil, &domainerrors.AppError{Code: "INVALID_ANSWERS", Message: "answers must be a valid JSON object"}
	}

	// Build field lookup maps for O(1) access.
	allFields := collectAllFields(form)
	fieldByKey := make(map[string]*entity.FormField, len(allFields))
	fieldByID := make(map[uuid.UUID]*entity.FormField, len(allFields))
	for i := range allFields {
		fieldByKey[allFields[i].FieldKey] = &allFields[i]
		fieldByID[allFields[i].ID] = &allFields[i]
	}

	// 6. Evaluate conditional visibility (server-side).
	visibility := evaluateVisibility(allFields, fieldByID, answers)

	// 7. Validate required fields — skip hidden fields entirely.
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

	// 8. Validate value types for all provided answers.
	for key, val := range answers {
		field, exists := fieldByKey[key]
		if !exists {
			continue // ignore unknown keys
		}
		if !visibility[key] {
			continue // skip hidden fields
		}
		if err := validateFieldValue(field, val); err != nil {
			return nil, err
		}
	}

	// 9. Persist the response.
	response := &entity.FormResponse{
		FormID:       input.FormID,
		RespondentID: input.RespondentID,
		Answers:      input.Answers,
	}
	created, err := uc.responseRepo.Create(ctx, response)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to submit response")
	}

	// 10. Return output.
	return &SubmitResponseOutput{
		ResponseID:  created.ID,
		SubmittedAt: created.SubmittedAt,
	}, nil
}

// ---------------------------------------------------------------------------
// Helper functions (package-level, shared across usecase files)
// ---------------------------------------------------------------------------

// collectAllFields flattens all fields from every section of a form.
func collectAllFields(form *entity.Form) []entity.FormField {
	var fields []entity.FormField
	for i := range form.Sections {
		fields = append(fields, form.Sections[i].Fields...)
	}
	return fields
}

// evaluateVisibility determines which fields are visible based on conditional
// logic. A field without a condition is always visible. A field with a
// condition is visible only when the source field's answer equals the
// condition value (simple "equals" check).
func evaluateVisibility(fields []entity.FormField, fieldByID map[uuid.UUID]*entity.FormField, answers map[string]interface{}) map[string]bool {
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
		if ok && answerVal == *field.ConditionValue {
			visible[field.FieldKey] = true
		} else {
			visible[field.FieldKey] = false
		}
	}
	return visible
}

// isEmpty checks if a value is considered empty for required-field validation.
func isEmpty(val interface{}) bool {
	switch v := val.(type) {
	case string:
		return v == ""
	case []interface{}:
		return len(v) == 0
	case nil:
		return true
	default:
		return false
	}
}

// validateFieldValue checks that the answer value matches the expected type
// and, for option-based fields, that the value is one of the allowed options.
func validateFieldValue(field *entity.FormField, val interface{}) error {
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
		arr, ok := val.([]interface{})
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

// isValidOption checks if a value matches one of the field's allowed options.
func isValidOption(options []entity.FieldOption, value string) bool {
	for _, opt := range options {
		if opt.Value == value {
			return true
		}
	}
	return false
}
