package entity

import (
	"testing"

	domainErrors "github.com/manris/backend/internal/domain/errors"
)

func TestMitigationValidateAllowsKMKFields(t *testing.T) {
	m := Mitigation{
		Action:                 "Kurangi frekuensi review",
		Owner:                  "PIC",
		MitigationType:         MitigationTypeReduceBoth,
		ActivityStage:          "Pelaksanaan",
		ExpectedOutput:         "Risiko turun",
		QuantitativeTarget:     "Probability turun ke 2",
		SupportingUnit:         "Unit A",
		ResourcesRequired:      "2 SDM",
		ContingencyPlan:        "Rapat mingguan",
		PotentialObstacle:      "Penolakan internal",
		IsBreakthroughActivity: true,
		IsExistingControl:      false,
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
