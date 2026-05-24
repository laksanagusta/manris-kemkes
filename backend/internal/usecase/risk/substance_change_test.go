package risk

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestDetectSubstanceChanges_IgnoresScoreOnlyChanges(t *testing.T) {
	previous := &entity.Risk{
		Title:                "Risiko A",
		Description:          "Deskripsi A",
		Category:             entity.RiskCategoryOperasional,
		Cause:                []string{"Penyebab A"},
		RiskSource:           "internal",
		Controllability:      "C",
		ImpactDesc:           []string{"Dampak A"},
		ExistingControl:      "SOP A",
		ControlEffectiveness: "efektif",
		TreatmentOption:      "mitigate",
		Probability:          3,
		Impact:               3,
		Weight:               1.4,
		Nilai:                12.6,
		InherentScore:        13,
	}
	candidate := cloneRiskForSubstanceTest(previous)
	candidate.Probability = 4
	candidate.Impact = 4
	candidate.Weight = 1.9
	candidate.Nilai = 30.4
	candidate.InherentScore = 30

	changes := DetectSubstanceChanges(previous, candidate)
	if len(changes) != 0 {
		t.Fatalf("expected no substance changes, got %#v", changes)
	}
}

func TestDetectSubstanceChanges_FindsSubstanceFields(t *testing.T) {
	riskOwner := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	controlOwner := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	previous := &entity.Risk{
		Title:                "Risiko lama",
		Description:          "Deskripsi lama",
		Category:             entity.RiskCategoryOperasional,
		Cause:                []string{"Penyebab lama"},
		RiskSource:           "internal",
		Controllability:      "C",
		ImpactDesc:           []string{"Dampak lama"},
		ExistingControl:      "Kontrol lama",
		ControlEffectiveness: "tidak_efektif",
		TreatmentOption:      "mitigate",
		RiskOwnerID:          &riskOwner,
		ControlOwnerID:       &controlOwner,
		Mitigations: []entity.Mitigation{
			{Action: "Aksi lama", Owner: "PIC lama"},
		},
	}
	candidate := cloneRiskForSubstanceTest(previous)
	candidate.Title = "Risiko baru"
	candidate.Cause = []string{"Penyebab lama", "Penyebab baru"}
	candidate.ExistingControl = "Kontrol baru"
	candidate.Mitigations = []entity.Mitigation{
		{Action: "Aksi baru", Owner: "PIC baru"},
	}

	changes := DetectSubstanceChanges(previous, candidate)
	got := make(map[string]bool, len(changes))
	for _, change := range changes {
		got[change.Field] = true
	}

	for _, field := range []string{"title", "cause", "existingControl", "mitigations"} {
		if !got[field] {
			t.Fatalf("expected field %q in changes, got %#v", field, changes)
		}
	}
}

func TestBuildSubstanceChangeWarnings_FlagsFundamentalChanges(t *testing.T) {
	previousOwner := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	nextOwner := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	previous := &entity.Risk{
		Title:       "Risiko lama",
		Description: "Deskripsi lama",
		RiskSource:  "internal",
		RiskOwnerID: &previousOwner,
	}
	candidate := cloneRiskForSubstanceTest(previous)
	candidate.Title = "Risiko baru"
	candidate.Description = "Deskripsi baru"
	candidate.RiskSource = "eksternal"
	candidate.RiskOwnerID = &nextOwner

	warnings := BuildSubstanceChangeWarnings(previous, candidate)
	if len(warnings) != 1 {
		t.Fatalf("expected 1 warning, got %#v", warnings)
	}
	if !strings.Contains(warnings[0], "risiko baru") {
		t.Fatalf("unexpected warning: %q", warnings[0])
	}
}

func cloneRiskForSubstanceTest(risk *entity.Risk) *entity.Risk {
	if risk == nil {
		return nil
	}
	copy := *risk
	copy.Cause = append([]string(nil), risk.Cause...)
	copy.ImpactDesc = append([]string(nil), risk.ImpactDesc...)
	copy.Mitigations = append([]entity.Mitigation(nil), risk.Mitigations...)
	return &copy
}
