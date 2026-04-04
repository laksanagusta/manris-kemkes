package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestValidateForPublish(t *testing.T) {
	radioFieldID := uuid.New()
	textFieldID := uuid.New()
	checkboxFieldID := uuid.New()

	tests := []struct {
		name    string
		form    Form
		wantErr bool
	}{
		{
			name:    "0 sections → error",
			form:    Form{Sections: nil},
			wantErr: true,
		},
		{
			name: "1 section with 0 fields → error",
			form: Form{
				Sections: []FormSection{
					{Title: "Empty", Fields: nil},
				},
			},
			wantErr: true,
		},
		{
			name: "radio field with 1 option → error",
			form: Form{
				Sections: []FormSection{
					{
						Title: "S1",
						Fields: []FormField{
							{ID: radioFieldID, FieldType: FieldTypeRadio, Label: "Color", Options: []FieldOption{{Value: "red", Label: "Red"}}},
						},
					},
				},
			},
			wantErr: true,
		},
		{
			name: "checkbox field as condition source → error",
			form: Form{
				Sections: []FormSection{
					{
						Title: "S1",
						Fields: []FormField{
							{ID: checkboxFieldID, FieldType: FieldTypeCheckbox, Label: "Tags", Options: []FieldOption{{Value: "a", Label: "A"}, {Value: "b", Label: "B"}}},
							{ID: uuid.New(), FieldType: FieldTypeText, Label: "Detail", ConditionSourceFieldID: &checkboxFieldID, ConditionValue: condStr("a")},
						},
					},
				},
			},
			wantErr: true,
		},
		{
			name: "self-referencing conditional source → error",
			form: func() Form {
				fid := uuid.New()
				return Form{
					Sections: []FormSection{
						{
							Title: "S1",
							Fields: []FormField{
								{ID: fid, FieldType: FieldTypeText, Label: "Self", ConditionSourceFieldID: &fid, ConditionValue: condStr("x")},
							},
						},
					},
				}
			}(),
			wantErr: true,
		},
		{
			name: "conditional source referencing non-existent field → error",
			form: func() Form {
				phantom := uuid.New()
				return Form{
					Sections: []FormSection{
						{
							Title: "S1",
							Fields: []FormField{
								{ID: uuid.New(), FieldType: FieldTypeText, Label: "Orphan", ConditionSourceFieldID: &phantom, ConditionValue: condStr("x")},
							},
						},
					},
				}
			}(),
			wantErr: true,
		},
		{
			name: "valid form: 1 section, 1 text field → nil",
			form: Form{
				Sections: []FormSection{
					{
						Title: "S1",
						Fields: []FormField{
							{ID: textFieldID, FieldType: FieldTypeText, Label: "Name"},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid form with radio (2 options) and conditional text → nil",
			form: Form{
				Sections: []FormSection{
					{
						Title: "S1",
						Fields: []FormField{
							{ID: radioFieldID, FieldType: FieldTypeRadio, Label: "Color", Options: []FieldOption{{Value: "red", Label: "Red"}, {Value: "blue", Label: "Blue"}}},
							{ID: uuid.New(), FieldType: FieldTypeText, Label: "Detail", ConditionSourceFieldID: &radioFieldID, ConditionValue: condStr("red")},
						},
					},
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateForPublish()
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateForPublish() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func condStr(s string) *string { return &s }
