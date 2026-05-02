package risk

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestCreateRiskUseCase_RejectsRiskUtamaWithoutNewMitigation(t *testing.T) {
	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risk utama",
		Category:          entity.RiskCategoryKebijakan,
		CreatedBy:         &createdBy,
		Probability:       4,
		Impact:            3,
		TreatmentOption:   "mitigate",
		TargetProbability: 2,
		TargetImpact:      2,
		Mitigations: []entity.Mitigation{{
			Action:            "Kontrol lama",
			Owner:             "PIC",
			IsExistingControl: true,
		}},
	})
	if err == nil {
		t.Fatal("expected validation error")
	}
	if !strings.Contains(err.Error(), "requires at least one new mitigation plan") {
		t.Fatalf("expected mitigation requirement error, got %v", err)
	}
}

func TestCreateRiskUseCase_AllowsRiskUtamaWithNewMitigation(t *testing.T) {
	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risk utama",
		Category:          entity.RiskCategoryKebijakan,
		CreatedBy:         &createdBy,
		Probability:       4,
		Impact:            3,
		TreatmentOption:   "mitigate",
		TargetProbability: 2,
		TargetImpact:      2,
		Mitigations: []entity.Mitigation{{
			Action: "Kurangi risiko",
			Owner:  "PIC",
		}},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.created == nil {
		t.Fatal("expected risk to be created")
	}
	if riskRepo.created.Mitigations[0].MitigationType != entity.MitigationTypeReduceProbability {
		t.Fatalf("expected default mitigation type, got %q", riskRepo.created.Mitigations[0].MitigationType)
	}
}
