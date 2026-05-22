package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestCreateRiskUseCase_AcceptsMissingRO(t *testing.T) {
	t.Parallel()

	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()

	output, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risiko tanpa RO",
		Category:          entity.RiskCategoryOperasional,
		CreatedBy:         &createdBy,
		Probability:       2,
		Impact:            2,
		TargetProbability: 1,
		TargetImpact:      1,
	})
	if err != nil {
		t.Fatalf("expected no error when roId is optional, got %v", err)
	}
	if output == nil {
		t.Fatal("expected output, got nil")
	}
	if riskRepo.created == nil {
		t.Fatal("expected create to proceed to repository write")
	}
	if riskRepo.created.ROID != nil {
		t.Fatalf("expected ROID to be nil, got %v", *riskRepo.created.ROID)
	}
}

func TestUpdateRiskUseCase_AcceptsMissingRO(t *testing.T) {
	t.Parallel()

	riskID := uuid.New()
	orgID := uuid.New()
	riskRepo := &categoryRiskRepo{byID: &entity.Risk{
		ID:             riskID,
		Code:           "R-001",
		Title:          "Existing risk",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusDraft,
		VersionGroupID: uuid.New(),
		OrganizationID: &orgID,
		Probability:    2,
		Impact:         2,
	}}

	uc := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, nil, nil)
	output, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Updated risk",
		Description:    "Updated desc",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusDraft,
		OrganizationID: &orgID,
		Probability:    2,
		Impact:         2,
	}, nil)
	if err != nil {
		t.Fatalf("expected no error when roId is optional, got %v", err)
	}
	if output == nil {
		t.Fatal("expected output, got nil")
	}
	if riskRepo.updated == nil {
		t.Fatal("expected update to proceed to repository write")
	}
	if riskRepo.updated.ROID != nil {
		t.Fatalf("expected ROID to be nil, got %v", *riskRepo.updated.ROID)
	}
}
