package risk

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
)

func TestCreateRiskUseCase_AllowsDraftWithEmptyMitigationRow(t *testing.T) {
	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()
	roID := uuid.New()

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risk utama",
		Category:          entity.RiskCategoryKebijakan,
		CreatedBy:         &createdBy,
		ROID:              &roID,
		Probability:       4,
		Impact:            3,
		TreatmentOption:   "mitigate",
		TargetProbability: 2,
		TargetImpact:      2,
		Mitigations:       []entity.Mitigation{{}},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.created == nil {
		t.Fatal("expected risk to be created")
	}
	if len(riskRepo.created.Mitigations) != 0 {
		t.Fatalf("expected empty mitigation row to be pruned, got %d items", len(riskRepo.created.Mitigations))
	}
}

func TestUpdateRiskUseCase_RejectsApprovedRiskUtamaWithoutNewMitigation(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	roID := uuid.New()
	riskRepo := &categoryRiskRepo{byID: &entity.Risk{
		ID:             riskID,
		Code:           "R-001",
		Title:          "Old title",
		Category:       entity.RiskCategoryKebijakan,
		Status:         entity.RiskStatusDraft,
		VersionGroupID: uuid.New(),
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         3,
	}}

	uc := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, nil, nil)
	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:                riskID,
		Title:             "Updated title",
		Description:       "Updated desc",
		Category:          entity.RiskCategoryKebijakan,
		Status:            entity.RiskStatusApproved,
		OrganizationID:    &orgID,
		ROID:              &roID,
		Probability:       4,
		Impact:            3,
		TreatmentOption:   "mitigate",
		TargetProbability: 2,
		TargetImpact:      2,
		Mitigations:       []entity.Mitigation{{}},
	}, nil)
	if err == nil {
		t.Fatal("expected validation error")
	}
	if !strings.Contains(err.Error(), "risiko utama dengan perlakuan mitigasi memerlukan minimal satu rencana mitigasi baru") {
		t.Fatalf("expected mitigation requirement error, got %v", err)
	}
	if !errors.Is(err, apperrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input error, got %v", err)
	}
}

func TestValidateRiskMitigationRequirements(t *testing.T) {
	for _, tt := range []struct {
		name        string
		probability int
		impact      int
		treatment   string
		mitigations []entity.Mitigation
		wantError   bool
	}{
		{name: "utama without plans", probability: 4, impact: 3, treatment: "mitigate", wantError: true},
		{name: "utama with existing control only", probability: 4, impact: 3, treatment: "mitigate", mitigations: []entity.Mitigation{{Action: "Kontrol lama", IsExistingControl: true}}, wantError: true},
		{name: "utama with new plan", probability: 4, impact: 3, treatment: "mitigate", mitigations: []entity.Mitigation{{Action: "Rencana baru"}}},
		{name: "below utama threshold", probability: 1, impact: 1, treatment: "mitigate"},
		{name: "utama accepts risk", probability: 4, impact: 3, treatment: "accept"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			risk := &entity.Risk{Probability: tt.probability, Impact: tt.impact, TreatmentOption: tt.treatment, Mitigations: tt.mitigations}
			risk.CalculateAll()
			err := validateRiskMitigationRequirements(risk)
			if tt.wantError {
				if !errors.Is(err, apperrors.ErrRiskUtamaMitigationRequired) {
					t.Fatalf("expected localized mitigation requirement error, got %v", err)
				}
			} else if err != nil {
				t.Fatalf("expected valid mitigation plan, got %v", err)
			}
		})
	}
}
