package risk

import (
	"context"
	stdErrors "errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestCreateRiskUseCase_RejectsMissingROWhenRequired(t *testing.T) {
	t.Parallel()

	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risiko tanpa RO",
		Category:          entity.RiskCategoryOperasional,
		CreatedBy:         &createdBy,
		Probability:       2,
		Impact:            2,
		TargetProbability: 1,
		TargetImpact:      1,
	})
	if err == nil {
		t.Fatal("expected validation error when roId missing")
	}
	if !stdErrors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input error, got %v", err)
	}
	if !strings.Contains(err.Error(), "roId is required") {
		t.Fatalf("expected roId validation message, got %v", err)
	}
	if riskRepo.created != nil {
		t.Fatal("expected create to stop before repository write")
	}
}

func TestUpdateRiskUseCase_RejectsMissingRO(t *testing.T) {
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
	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Updated risk",
		Description:    "Updated desc",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusDraft,
		OrganizationID: &orgID,
		Probability:    2,
		Impact:         2,
	}, nil)
	if err == nil {
		t.Fatal("expected validation error when roId missing")
	}
	if !stdErrors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input error, got %v", err)
	}
	if !strings.Contains(err.Error(), "roId is required") {
		t.Fatalf("expected roId validation message, got %v", err)
	}
	if riskRepo.updated != nil {
		t.Fatal("expected update to stop before repository write")
	}
}
