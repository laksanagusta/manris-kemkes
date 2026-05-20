package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestPlanningGoalValidate(t *testing.T) {
	t.Parallel()

	if err := (PlanningGoal{OrganizationID: uuid.New(), Period: "2027", Title: "Tujuan", Status: "draft"}).Validate(); err != nil {
		t.Fatalf("expected valid planning goal, got %v", err)
	}
	if err := (PlanningGoal{Title: "Tujuan"}).Validate(); err == nil {
		t.Fatal("expected error for missing period")
	}
}
