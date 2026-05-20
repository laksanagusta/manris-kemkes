package risk

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
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
	if !strings.Contains(err.Error(), "requires at least one new mitigation plan") {
		t.Fatalf("expected mitigation requirement error, got %v", err)
	}
}
