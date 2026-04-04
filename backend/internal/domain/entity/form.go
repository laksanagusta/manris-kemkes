package entity

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

const (
	FormStatusDraft     = "draft"
	FormStatusPublished = "published"
	FormStatusClosed    = "closed"
)

const (
	FieldTypeText     = "text"
	FieldTypeTextarea = "textarea"
	FieldTypeRadio    = "radio"
	FieldTypeCheckbox = "checkbox"
	FieldTypeDropdown = "dropdown"
)

var validFieldTypes = map[string]struct{}{
	FieldTypeText:     {},
	FieldTypeTextarea: {},
	FieldTypeRadio:    {},
	FieldTypeCheckbox: {},
	FieldTypeDropdown: {},
}

// IsValidFieldType checks whether the given field type is recognised.
func IsValidFieldType(ft string) bool {
	_, ok := validFieldTypes[ft]
	return ok
}

// FieldTypeHasOptions returns true for field types that require an options list.
func FieldTypeHasOptions(ft string) bool {
	return ft == FieldTypeRadio || ft == FieldTypeCheckbox || ft == FieldTypeDropdown
}

// Form is the aggregate root for dynamic forms.
type Form struct {
	ID             uuid.UUID     `json:"id"`
	Title          string        `json:"title"`
	Description    *string       `json:"description,omitempty"`
	Status         string        `json:"status"`
	TargetAudience string        `json:"targetAudience"`
	CreatedBy      uuid.UUID     `json:"createdBy"`
	Sections       []FormSection `json:"sections,omitempty"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// FormSection represents an ordered group of fields within a form.
type FormSection struct {
	ID          uuid.UUID   `json:"id"`
	FormID      uuid.UUID   `json:"formId"`
	Title       string      `json:"title"`
	Description *string     `json:"description,omitempty"`
	Position    int         `json:"position"`
	Fields      []FormField `json:"fields,omitempty"`
	CreatedAt   time.Time   `json:"createdAt"`
}

// FormField represents a single input element within a section.
type FormField struct {
	ID                     uuid.UUID     `json:"id"`
	SectionID              uuid.UUID     `json:"sectionId"`
	FormID                 uuid.UUID     `json:"formId"`
	FieldType              string        `json:"fieldType"`
	FieldKey               string        `json:"fieldKey"`
	Label                  string        `json:"label"`
	Placeholder            *string       `json:"placeholder,omitempty"`
	IsRequired             bool          `json:"isRequired"`
	Options                []FieldOption `json:"options,omitempty"`
	Position               int           `json:"position"`
	ConditionSourceFieldID *uuid.UUID    `json:"conditionSourceFieldId,omitempty"`
	ConditionValue         *string       `json:"conditionValue,omitempty"`
	CreatedAt              time.Time     `json:"createdAt"`
}

// FieldOption is a single choice within a radio, checkbox, or dropdown field.
type FieldOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// FormResponse captures a single respondent's answers to a form.
type FormResponse struct {
	ID           uuid.UUID       `json:"id"`
	FormID       uuid.UUID       `json:"formId"`
	RespondentID uuid.UUID       `json:"respondentId"`
	Answers      json.RawMessage `json:"answers"`
	SubmittedAt  time.Time       `json:"submittedAt"`
}

// FormAssignment links a form to an organisation for targeted distribution.
type FormAssignment struct {
	ID             uuid.UUID `json:"id"`
	FormID         uuid.UUID `json:"formId"`
	OrganizationID uuid.UUID `json:"organizationId"`
	CreatedAt      time.Time `json:"createdAt"`
}

// FormFieldAnalytics holds aggregated answer counts for a single field.
type FormFieldAnalytics struct {
	FieldID   uuid.UUID      `json:"fieldId"`
	FieldKey  string         `json:"fieldKey"`
	Label     string         `json:"label"`
	FieldType string         `json:"fieldType"`
	Summary   map[string]int `json:"summary"`
}

// FormFieldTrends holds time-series answer counts for a single field.
type FormFieldTrends struct {
	FieldID   uuid.UUID    `json:"fieldId"`
	FieldKey  string       `json:"fieldKey"`
	Label     string       `json:"label"`
	FieldType string       `json:"fieldType"`
	Trends    []TrendPoint `json:"trends"`
}

// TrendPoint is a single data point in a field trend series.
type TrendPoint struct {
	Period string         `json:"period"`
	Values map[string]int `json:"values"`
}

// IsEditable returns true only when the form is in draft status.
func (f *Form) IsEditable() bool {
	return f.Status == FormStatusDraft
}

// IsAcceptingResponses returns true only when the form is published.
func (f *Form) IsAcceptingResponses() bool {
	return f.Status == FormStatusPublished
}

// ValidateForPublish checks all pre-conditions required before a form can be
// transitioned from draft to published:
//   - At least 1 section
//   - Each section has at least 1 field
//   - radio/checkbox/dropdown fields have ≥ 2 options
//   - No field references itself as conditional source
//   - Conditional source field IDs must exist within the same form
//   - Checkbox fields cannot be conditional sources
func (f *Form) ValidateForPublish() error {
	if len(f.Sections) == 0 {
		return fmt.Errorf("form must have at least one section")
	}

	fieldTypeByID := make(map[uuid.UUID]string)
	for i := range f.Sections {
		for j := range f.Sections[i].Fields {
			field := &f.Sections[i].Fields[j]
			fieldTypeByID[field.ID] = field.FieldType
		}
	}

	for i := range f.Sections {
		section := &f.Sections[i]
		if len(section.Fields) == 0 {
			return fmt.Errorf("section %q must have at least one field", section.Title)
		}

		for j := range section.Fields {
			field := &section.Fields[j]

			if !IsValidFieldType(field.FieldType) {
				return fmt.Errorf("field %q has invalid type %q", field.Label, field.FieldType)
			}

			if FieldTypeHasOptions(field.FieldType) && len(field.Options) < 2 {
				return fmt.Errorf("field %q (%s) must have at least 2 options", field.Label, field.FieldType)
			}

			if field.ConditionSourceFieldID != nil {
				sourceID := *field.ConditionSourceFieldID

				if sourceID == field.ID {
					return fmt.Errorf("field %q cannot reference itself as conditional source", field.Label)
				}

				sourceType, exists := fieldTypeByID[sourceID]
				if !exists {
					return fmt.Errorf("field %q references a conditional source that does not exist in this form", field.Label)
				}

				if sourceType == FieldTypeCheckbox {
					return fmt.Errorf("field %q references a checkbox field as conditional source, which is not allowed", field.Label)
				}
			}
		}
	}

	return nil
}
