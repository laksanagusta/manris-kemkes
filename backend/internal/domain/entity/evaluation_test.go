package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestEvaluationValidateRequiresOrganizationPeriodTemplateAndStatus(t *testing.T) {
	evaluation := Evaluation{
		OrganizationID: uuid.New(),
		Period:         "2026-H1",
		TemplateID:     uuid.New(),
		Status:         EvaluationStatusDraft,
	}
	if err := evaluation.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}

	evaluation.Status = "submitted"
	if err := evaluation.Validate(); err == nil {
		t.Fatal("expected invalid status error")
	}
}

func TestEvaluationItemValidateAnswer(t *testing.T) {
	item := EvaluationItem{ItemKey: "policy_basis", ItemNo: "1", Label: "Policy", Answer: EvaluationAnswerUnset}
	if err := item.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
	item.Answer = "maybe"
	if err := item.Validate(); err == nil {
		t.Fatal("expected invalid answer error")
	}
}
