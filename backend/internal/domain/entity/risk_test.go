package entity

import (
	"testing"

	domainErrors "github.com/manris/backend/internal/domain/errors"
)

func makeValidRiskForCategoryValidation(category string) *Risk {
	return &Risk{
		Code:        "R-001",
		Title:       "Risiko uji kategori",
		Status:      "draft",
		Probability: 3,
		Impact:      3,
		Category:    category,
	}
}

func TestRiskCategoryAllowsConfiguredKeys(t *testing.T) {
	allowedCategories := []string{
		RiskCategoryStrategis,
		RiskCategoryOperasional,
		RiskCategoryKepatuhan,
		RiskCategoryFinansial,
		RiskCategoryReputasi,
		RiskCategoryTeknologiInformasi,
	}

	for _, category := range allowedCategories {
		t.Run(category, func(t *testing.T) {
			risk := makeValidRiskForCategoryValidation(category)

			if !IsValidRiskCategory(risk.Category) {
				t.Fatalf("expected category %q to be valid", risk.Category)
			}

			if err := risk.Validate(); err != nil {
				t.Fatalf("expected no validation error for category %q, got %v", risk.Category, err)
			}
		})
	}
}

func TestRiskCategoryRejectsUnknownKeys(t *testing.T) {
	risk := makeValidRiskForCategoryValidation("keamanan")

	if IsValidRiskCategory(risk.Category) {
		t.Fatalf("expected category %q to be invalid", risk.Category)
	}

	err := risk.Validate()
	if err == nil {
		t.Fatalf("expected validation error for category %q", risk.Category)
	}
	if err != domainErrors.ErrInvalidRiskCategory {
		t.Fatalf("expected ErrInvalidRiskCategory, got %v", err)
	}
}

func TestRiskCategoryAllowsLegacyBlankForReadOnlyRollout(t *testing.T) {
	risk := makeValidRiskForCategoryValidation("")

	if !IsValidRiskCategory(risk.Category) {
		t.Fatalf("expected blank category to be valid during rollout")
	}

	if err := risk.Validate(); err != nil {
		t.Fatalf("expected no validation error for blank category rollout, got %v", err)
	}
}
