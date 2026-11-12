package entity

import (
	"testing"

	domainErrors "github.com/manris/backend/internal/domain/errors"
)

func TestMitigationValidateAllowsKMKFields(t *testing.T) {
	m := Mitigation{
		Action:         "Kurangi frekuensi review",
		Owner:          "PIC",
		MitigationType: MitigationTypeReduceBoth,
	}

	if err := m.Validate(); err != nil {
		t.Fatalf("expected no validation error, got %v", err)
	}
}

func TestMitigationValidateRejectsUnknownType(t *testing.T) {
	m := Mitigation{
		Action:         "Kurangi frekuensi review",
		Owner:          "PIC",
		MitigationType: "unknown",
	}

	err := m.Validate()
	if err == nil {
		t.Fatal("expected validation error")
	}
	if err != domainErrors.ErrInvalidMitigationType {
		t.Fatalf("expected ErrInvalidMitigationType, got %v", err)
	}
}

func TestMitigationValidateNormalizesBlankDueDateToNil(t *testing.T) {
	blank := "   "
	m := Mitigation{
		Action:  "Kurangi frekuensi review",
		Owner:   "PIC",
		DueDate: &blank,
	}

	if err := m.Validate(); err != nil {
		t.Fatalf("expected no validation error, got %v", err)
	}
	if m.DueDate != nil {
		t.Fatalf("expected blank due date to normalize to nil, got %q", *m.DueDate)
	}
}
