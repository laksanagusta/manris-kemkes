package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestCreateRiskUseCase_FinalizesNewRiskInSingleCreateOperation(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	repo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(repo, &categoryUserRepo{}, &categoryOrgRepo{})

	output, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:           "Final risk",
		Description:     "Created directly as final",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusFinal,
		OrganizationID:  &orgID,
		CreatedBy:       &createdBy,
		Probability:     3,
		Impact:          3,
		AssessmentCycle: "2026-Q2",
	})
	if err != nil {
		t.Fatalf("expected direct final creation to succeed, got %v", err)
	}
	if output.ID == uuid.Nil {
		t.Fatal("expected created risk id")
	}
	if repo.created == nil || repo.created.Status != entity.RiskStatusFinal {
		t.Fatalf("expected repository to receive final risk, got %#v", repo.created)
	}
	if repo.created.FinalizedAt == nil || repo.created.EffectiveFrom == nil {
		t.Fatalf("expected finalization metadata to be populated, got %#v", repo.created)
	}
}
