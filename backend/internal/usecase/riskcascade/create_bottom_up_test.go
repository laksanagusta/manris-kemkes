package riskcascade

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestCreateMandatoryRejectsTargetOutsideScope(t *testing.T) {
	sourceOrgID := uuid.New()
	targetOrgID := uuid.New()
	sourceRiskID := uuid.New()

	cascadeRepo := &fakeRiskCascadeRepo{}
	riskRepo := &fakeRiskRepo{
		source: &entity.Risk{
			ID:             sourceRiskID,
			Code:           "R-001",
			Title:          "Risiko sumber",
			Category:       entity.RiskCategoryOperasional,
			Status:         entity.RiskStatusApproved,
			VersionGroupID: uuid.New(),
			IsCurrent:      true,
			IsCycleCurrent: true,
			VersionNumber:  1,
			OrganizationID: &sourceOrgID,
			Probability:    3,
			Impact:         3,
			Weight:         1,
		},
	}
	orgRepo := &fakeOrgRepo{}
	uc := NewCreateMandatoryUseCase(cascadeRepo, riskRepo, orgRepo)

	_, err := uc.Execute(context.Background(), CreateMandatoryInput{
		SourceRiskID: sourceRiskID,
		TargetOrgID:  targetOrgID,
		OrgIDs:       []uuid.UUID{sourceOrgID},
	})
	if err == nil {
		t.Fatal("expected forbidden error")
	}
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}

func TestCreateBottomUpAllowsTargetOutsideScope(t *testing.T) {
	sourceOrgID := uuid.New()
	targetOrgID := uuid.New()
	sourceRiskID := uuid.New()

	cascadeRepo := &fakeRiskCascadeRepo{}
	riskRepo := &fakeRiskRepo{
		source: &entity.Risk{
			ID:             sourceRiskID,
			Code:           "R-001",
			Title:          "Risiko sumber",
			Category:       entity.RiskCategoryOperasional,
			Status:         entity.RiskStatusApproved,
			VersionGroupID: uuid.New(),
			IsCurrent:      true,
			IsCycleCurrent: true,
			VersionNumber:  1,
			OrganizationID: &sourceOrgID,
			Probability:    3,
			Impact:         3,
			Weight:         1,
		},
	}
	orgRepo := &fakeOrgRepo{}
	uc := NewCreateBottomUpUseCase(cascadeRepo, riskRepo, orgRepo)

	cascade, err := uc.Execute(context.Background(), CreateBottomUpInput{
		SourceRiskID: sourceRiskID,
		TargetOrgID:  targetOrgID,
		OrgIDs:       []uuid.UUID{sourceOrgID},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if cascade == nil {
		t.Fatal("expected cascade result")
	}
	if cascade.TargetOrgID != targetOrgID {
		t.Fatalf("expected target org %v, got %v", targetOrgID, cascade.TargetOrgID)
	}
	if cascade.CascadeType != "bottom_up_escalation" {
		t.Fatalf("expected bottom up cascade type, got %q", cascade.CascadeType)
	}
}
