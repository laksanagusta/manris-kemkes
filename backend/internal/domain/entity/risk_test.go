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

func TestGetBobot(t *testing.T) {
	tests := []struct {
		probability int
		impact      int
		expected    float64
	}{
		// Row 1: Jarang (Probability = 1)
		{1, 1, 1.0},
		{1, 2, 1.5},
		{1, 3, 2.0},
		{1, 4, 3.0},
		{1, 5, 4.0},
		// Row 2: Kemungkinan Kecil (Probability = 2)
		{2, 1, 1.0},
		{2, 2, 1.8},
		{2, 3, 1.83},
		{2, 4, 1.9},
		{2, 5, 2.1},
		// Row 3: Kemungkinan Sedang (Probability = 3)
		{3, 1, 1.17},
		{3, 2, 1.42},
		{3, 3, 1.43},
		{3, 4, 1.46},
		{3, 5, 1.47},
		// Row 4: Kemungkinan Besar (Probability = 4)
		{4, 1, 1.2},
		{4, 2, 1.19},
		{4, 3, 1.3},
		{4, 4, 1.16},
		{4, 5, 1.2},
		// Row 5: Hampir Pasti Terjadi (Probability = 5)
		{5, 1, 1.5},
		{5, 2, 1.4},
		{5, 3, 1.13},
		{5, 4, 1.15},
		{5, 5, 1.0},
	}

	for _, tt := range tests {
		result := GetBobot(tt.probability, tt.impact)
		if result != tt.expected {
			t.Errorf("GetBobot(%d, %d) = %v, want %v", tt.probability, tt.impact, result, tt.expected)
		}
	}
}

func TestGetBobotOutOfRange(t *testing.T) {
	// Test out of range values should return default 1.0
	if GetBobot(0, 1) != 1.0 {
		t.Error("GetBobot(0, 1) should return 1.0")
	}
	if GetBobot(6, 1) != 1.0 {
		t.Error("GetBobot(6, 1) should return 1.0")
	}
	if GetBobot(1, 0) != 1.0 {
		t.Error("GetBobot(1, 0) should return 1.0")
	}
	if GetBobot(1, 6) != 1.0 {
		t.Error("GetBobot(1, 6) should return 1.0")
	}
}

func TestCalculateNilai(t *testing.T) {
	tests := []struct {
		probability int
		impact      int
		weight      float64
		expected    float64
	}{
		{5, 5, 1.0, 25.0},
		{5, 4, 1.15, 23.0},
		{3, 3, 1.43, 12.87},
		{2, 2, 1.8, 7.2},
		{1, 1, 1.0, 1.0},
	}

	for _, tt := range tests {
		result := CalculateNilai(tt.probability, tt.impact, tt.weight)
		if result < tt.expected-0.01 || result > tt.expected+0.01 {
			t.Errorf("CalculateNilai(%d, %d, %v) = %v, want %v", tt.probability, tt.impact, tt.weight, result, tt.expected)
		}
	}
}

func TestGetRiskLevelFromNilai(t *testing.T) {
	tests := []struct {
		nilai    float64
		expected string
	}{
		{1.0, RiskLevelSangatRendah},
		{4.9, RiskLevelRendah},
		{5.0, RiskLevelRendah},
		{9.9, RiskLevelSedang},
		{10.0, RiskLevelSedang},
		{14.9, RiskLevelTinggi},
		{15.0, RiskLevelTinggi},
		{19.9, RiskLevelSangatTinggi},
		{20.0, RiskLevelSangatTinggi},
		{25.0, RiskLevelSangatTinggi},
	}

	for _, tt := range tests {
		result := GetRiskLevelFromNilai(tt.nilai)
		if result != tt.expected {
			t.Errorf("GetRiskLevelFromNilai(%v) = %v, want %v", tt.nilai, result, tt.expected)
		}
	}
}

func TestGetRiskPriorityFromLevel(t *testing.T) {
	tests := []struct {
		level    string
		expected int
	}{
		{RiskLevelSangatTinggi, 1},
		{RiskLevelTinggi, 2},
		{RiskLevelSedang, 3},
		{RiskLevelRendah, 4},
		{RiskLevelSangatRendah, 5},
		{"unknown", 5},
	}

	for _, tt := range tests {
		result := GetRiskPriorityFromLevel(tt.level)
		if result != tt.expected {
			t.Errorf("GetRiskPriorityFromLevel(%v) = %v, want %v", tt.level, result, tt.expected)
		}
	}
}

func TestGetRiskLevelDisplay(t *testing.T) {
	tests := []struct {
		level    string
		expected string
	}{
		{RiskLevelSangatTinggi, "Sangat Tinggi"},
		{RiskLevelTinggi, "Tinggi"},
		{RiskLevelSedang, "Sedang"},
		{RiskLevelRendah, "Rendah"},
		{RiskLevelSangatRendah, "Sangat Rendah"},
		{"unknown", "unknown"},
	}

	for _, tt := range tests {
		result := GetRiskLevelDisplay(tt.level)
		if result != tt.expected {
			t.Errorf("GetRiskLevelDisplay(%v) = %v, want %v", tt.level, result, tt.expected)
		}
	}
}

func TestRiskCalculateAll(t *testing.T) {
	risk := &Risk{
		Probability: 5,
		Impact:      5,
	}

	risk.CalculateAll()

	if risk.Weight != 1.0 {
		t.Errorf("Expected weight 1.0, got %v", risk.Weight)
	}

	if risk.Nilai != 25.0 {
		t.Errorf("Expected nilai 25.0, got %v", risk.Nilai)
	}

	if risk.RiskPriority != 1 {
		t.Errorf("Expected priority 1, got %v", risk.RiskPriority)
	}
}

func TestRiskCalculateTarget(t *testing.T) {
	risk := &Risk{
		TargetProbability: 2,
		TargetImpact:      3,
	}

	risk.CalculateTargetBobot()
	risk.CalculateTargetNilai()

	if risk.TargetWeight != 1.83 {
		t.Errorf("Expected target weight 1.83, got %v", risk.TargetWeight)
	}

	expectedNilai := 2.0 * 3.0 * 1.83
	if risk.TargetNilai != expectedNilai {
		t.Errorf("Expected target nilai %v, got %v", expectedNilai, risk.TargetNilai)
	}
}

func TestRiskEffectiveFieldsApprovedUsesReviewedBundleWhenComplete(t *testing.T) {
	reviewedProbability := 2
	reviewedImpact := 2
	reviewedWeight := 1.8
	reviewedNilai := 7.2
	reviewedScore := 7

	risk := &Risk{
		Status:              RiskStatusApproved,
		Probability:         5,
		Impact:              4,
		Weight:              1.15,
		Nilai:               23,
		ReviewedProbability: &reviewedProbability,
		ReviewedImpact:      &reviewedImpact,
		ReviewedWeight:      &reviewedWeight,
		ReviewedNilai:       &reviewedNilai,
		ReviewedScore:       &reviewedScore,
	}

	if got := risk.EffectiveProbability(); got != reviewedProbability {
		t.Fatalf("EffectiveProbability() = %d, want %d", got, reviewedProbability)
	}
	if got := risk.EffectiveImpact(); got != reviewedImpact {
		t.Fatalf("EffectiveImpact() = %d, want %d", got, reviewedImpact)
	}
	if got := risk.EffectiveNilai(); got != reviewedNilai {
		t.Fatalf("EffectiveNilai() = %v, want %v", got, reviewedNilai)
	}
	if got := risk.GetEffectiveScore(); got != reviewedScore {
		t.Fatalf("GetEffectiveScore() = %d, want %d", got, reviewedScore)
	}
	if got := risk.GetRiskLevel(); got != RiskLevelRendah {
		t.Fatalf("GetRiskLevel() = %q, want %q", got, RiskLevelRendah)
	}
	if got := risk.GetRiskPriority(); got != 4 {
		t.Fatalf("GetRiskPriority() = %d, want 4", got)
	}
}

func TestRiskEffectiveFieldsApprovedFallsBackWhenReviewedBundleIncomplete(t *testing.T) {
	reviewedProbability := 2
	reviewedImpact := 2
	reviewedNilai := 7.2
	reviewedScore := 7

	risk := &Risk{
		Status:              RiskStatusApproved,
		Probability:         5,
		Impact:              4,
		Weight:              1.15,
		Nilai:               23,
		ReviewedProbability: &reviewedProbability,
		ReviewedImpact:      &reviewedImpact,
		ReviewedNilai:       &reviewedNilai,
		ReviewedScore:       &reviewedScore,
	}

	if got := risk.EffectiveProbability(); got != 5 {
		t.Fatalf("EffectiveProbability() = %d, want 5", got)
	}
	if got := risk.EffectiveImpact(); got != 4 {
		t.Fatalf("EffectiveImpact() = %d, want 4", got)
	}
	if got := risk.EffectiveNilai(); got != 23 {
		t.Fatalf("EffectiveNilai() = %v, want 23", got)
	}
	if got := risk.GetEffectiveScore(); got != 23 {
		t.Fatalf("GetEffectiveScore() = %d, want 23", got)
	}
	if got := risk.GetRiskLevel(); got != RiskLevelSangatTinggi {
		t.Fatalf("GetRiskLevel() = %q, want %q", got, RiskLevelSangatTinggi)
	}
	if got := risk.GetRiskPriority(); got != 1 {
		t.Fatalf("GetRiskPriority() = %d, want 1", got)
	}
}

func TestRiskEffectiveFieldsNonFinalizedIgnoreReviewedBundle(t *testing.T) {
	reviewedProbability := 2
	reviewedImpact := 2
	reviewedWeight := 1.8
	reviewedNilai := 7.2
	reviewedScore := 7

	risk := &Risk{
		Status:              RiskStatusInApproval,
		Probability:         5,
		Impact:              4,
		Weight:              1.15,
		Nilai:               23,
		ReviewedProbability: &reviewedProbability,
		ReviewedImpact:      &reviewedImpact,
		ReviewedWeight:      &reviewedWeight,
		ReviewedNilai:       &reviewedNilai,
		ReviewedScore:       &reviewedScore,
	}

	if got := risk.EffectiveProbability(); got != 5 {
		t.Fatalf("EffectiveProbability() = %d, want 5", got)
	}
	if got := risk.EffectiveImpact(); got != 4 {
		t.Fatalf("EffectiveImpact() = %d, want 4", got)
	}
	if got := risk.EffectiveNilai(); got != 23 {
		t.Fatalf("EffectiveNilai() = %v, want 23", got)
	}
	if got := risk.GetEffectiveScore(); got != 23 {
		t.Fatalf("GetEffectiveScore() = %d, want 23", got)
	}
	if got := risk.GetRiskLevel(); got != RiskLevelSangatTinggi {
		t.Fatalf("GetRiskLevel() = %q, want %q", got, RiskLevelSangatTinggi)
	}
	if got := risk.GetRiskPriority(); got != 1 {
		t.Fatalf("GetRiskPriority() = %d, want 1", got)
	}
}

func TestRiskEffectiveFieldsApprovedKeepsZeroLikeReviewedBundle(t *testing.T) {
	reviewedProbability := 1
	reviewedImpact := 1
	reviewedWeight := 0.0
	reviewedNilai := 0.0
	reviewedScore := 0

	risk := &Risk{
		Status:              RiskStatusApproved,
		Probability:         5,
		Impact:              4,
		Weight:              1.15,
		Nilai:               23,
		ReviewedProbability: &reviewedProbability,
		ReviewedImpact:      &reviewedImpact,
		ReviewedWeight:      &reviewedWeight,
		ReviewedNilai:       &reviewedNilai,
		ReviewedScore:       &reviewedScore,
	}

	if got := risk.EffectiveProbability(); got != reviewedProbability {
		t.Fatalf("EffectiveProbability() = %d, want %d", got, reviewedProbability)
	}
	if got := risk.EffectiveImpact(); got != reviewedImpact {
		t.Fatalf("EffectiveImpact() = %d, want %d", got, reviewedImpact)
	}
	if got := risk.EffectiveNilai(); got != reviewedNilai {
		t.Fatalf("EffectiveNilai() = %v, want %v", got, reviewedNilai)
	}
	if got := risk.GetEffectiveScore(); got != reviewedScore {
		t.Fatalf("GetEffectiveScore() = %d, want %d", got, reviewedScore)
	}
	if got := risk.GetRiskLevel(); got != RiskLevelSangatRendah {
		t.Fatalf("GetRiskLevel() = %q, want %q", got, RiskLevelSangatRendah)
	}
	if got := risk.GetRiskPriority(); got != 5 {
		t.Fatalf("GetRiskPriority() = %d, want 5", got)
	}
}

func TestRiskEffectiveFieldsApprovedFallsBackWhenReviewedBundleHasFalsyPartialValues(t *testing.T) {
	reviewedProbability := 1
	reviewedImpact := 1
	reviewedWeight := 0.0
	reviewedNilai := 0.0

	risk := &Risk{
		Status:              RiskStatusApproved,
		Probability:         5,
		Impact:              4,
		Weight:              1.15,
		Nilai:               23,
		InherentScore:       23,
		ReviewedProbability: &reviewedProbability,
		ReviewedImpact:      &reviewedImpact,
		ReviewedWeight:      &reviewedWeight,
		ReviewedNilai:       &reviewedNilai,
	}

	if got := risk.EffectiveProbability(); got != 5 {
		t.Fatalf("EffectiveProbability() = %d, want 5", got)
	}
	if got := risk.EffectiveImpact(); got != 4 {
		t.Fatalf("EffectiveImpact() = %d, want 4", got)
	}
	if got := risk.EffectiveNilai(); got != 23 {
		t.Fatalf("EffectiveNilai() = %v, want 23", got)
	}
	if got := risk.GetEffectiveScore(); got != 23 {
		t.Fatalf("GetEffectiveScore() = %d, want 23", got)
	}
}
