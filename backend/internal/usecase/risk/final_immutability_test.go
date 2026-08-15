package risk

import (
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestFinalRiskFieldsChangedDetectsAdministrativeMetadata(t *testing.T) {
	orgID := uuid.New()
	objectiveID := uuid.New()
	previous := &entity.Risk{
		Title:             "Risk",
		Description:       "Description",
		Category:          entity.RiskCategoryOperasional,
		OrganizationID:    &orgID,
		ObjectiveID:       &objectiveID,
		Probability:       3,
		Impact:            3,
		TargetProbability: 2,
		TargetImpact:      2,
		AssessmentCycle:   "2026-Q1",
		ReviewType:        "periodic",
		RiskAppetite:      "medium",
	}
	candidate := *previous
	candidate.RiskAppetite = "high"

	if !finalRiskFieldsChanged(previous, &candidate) {
		t.Fatal("expected risk appetite change to be blocked for final risk")
	}
}

func TestFinalRiskFieldsChangedAllowsExactNoop(t *testing.T) {
	orgID := uuid.New()
	previous := &entity.Risk{
		Title:           "Risk",
		Description:     "Description",
		Category:        entity.RiskCategoryOperasional,
		OrganizationID:  &orgID,
		Probability:     3,
		Impact:          3,
		AssessmentCycle: "2026-Q1",
		ReviewType:      "periodic",
	}
	candidate := *previous

	if finalRiskFieldsChanged(previous, &candidate) {
		t.Fatal("expected exact final risk payload to remain a no-op")
	}
}
