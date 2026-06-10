package entity

import (
	"math"
	"testing"

	"github.com/google/uuid"
)

func TestRiskMonitoringDetectModeScoreOnly(t *testing.T) {
	source := &Risk{
		Title:                "A",
		Category:             RiskCategoryOperasional,
		Probability:          3,
		Impact:               3,
		Weight:               GetBobot(3, 3),
		Nilai:                CalculateNilai(3, 3, GetBobot(3, 3)),
		Controllability:      "C",
		ControlEffectiveness: "efektif",
		RiskSource:           "internal",
	}
	draft := &RiskMonitoringDraftValues{
		Title:                "A",
		Category:             RiskCategoryOperasional,
		Probability:          4,
		Impact:               3,
		Controllability:      "C",
		ControlEffectiveness: "efektif",
		RiskSource:           "internal",
	}

	mode, changed := DetectRiskMonitoringMode(source, draft)
	if mode != RiskMonitoringModeScoreOnly {
		t.Fatalf("expected score_only, got %s", mode)
	}
	if len(changed) != 0 {
		t.Fatalf("expected no substance changes, got %v", changed)
	}
}

func TestRiskMonitoringDetectModeWithProfileRevision(t *testing.T) {
	source := &Risk{
		Title:                "A",
		Category:             RiskCategoryOperasional,
		Controllability:      "C",
		ControlEffectiveness: "efektif",
		RiskSource:           "internal",
	}
	draft := &RiskMonitoringDraftValues{
		Title:                "B",
		Category:             RiskCategoryOperasional,
		Controllability:      "C",
		ControlEffectiveness: "tidak_efektif",
		RiskSource:           "internal",
	}

	mode, changed := DetectRiskMonitoringMode(source, draft)
	if mode != RiskMonitoringModeWithProfileRevision {
		t.Fatalf("expected with_profile_revision, got %s", mode)
	}
	if len(changed) != 2 || changed[0] != "title" || changed[1] != "controlEffectiveness" {
		t.Fatalf("expected title change, got %v", changed)
	}
}

func TestRiskMonitoringObservedScoreSnapshot(t *testing.T) {
	m := &RiskMonitoring{ObservedProbability: 4, ObservedImpact: 5}
	m.CalculateObservedScore()

	if m.ObservedWeight != GetBobot(4, 5) {
		t.Fatalf("unexpected weight: %v", m.ObservedWeight)
	}
	if m.ObservedNilai != CalculateNilai(4, 5, GetBobot(4, 5)) {
		t.Fatalf("unexpected nilai: %v", m.ObservedNilai)
	}
	if m.ObservedLevel != GetRiskLevelFromNilai(m.ObservedNilai) {
		t.Fatalf("unexpected level: %s", m.ObservedLevel)
	}
}

func TestNewRiskMonitoringDraftCopiesSourceSnapshot(t *testing.T) {
	sourceID := uuid.New()
	startedBy := uuid.New()
	source := &Risk{
		ID:                   sourceID,
		Title:                "Risk A",
		Category:             RiskCategoryOperasional,
		Probability:          3,
		Impact:               4,
		Weight:               GetBobot(3, 4),
		Nilai:                CalculateNilai(3, 4, GetBobot(3, 4)),
		VersionNumber:        7,
		Cause:                []string{"cause"},
		ImpactDesc:           []string{"impact"},
		ControlEffectiveness: "efektif",
		TreatmentOption:      "mitigasi",
	}

	draft := NewRiskMonitoringDraft(source, "2026-H1", startedBy)
	if draft.SourceRiskID != sourceID {
		t.Fatalf("expected source risk id %s, got %s", sourceID, draft.SourceRiskID)
	}
	if draft.SourceVersionNumber != 7 {
		t.Fatalf("expected source version 7, got %d", draft.SourceVersionNumber)
	}
	if draft.SourceNilai != math.Round(source.Nilai) {
		t.Fatalf("expected source nilai %v, got %v", math.Round(source.Nilai), draft.SourceNilai)
	}
	if draft.DraftPayload == nil || draft.DraftPayload.Title != source.Title {
		t.Fatalf("expected draft payload title %q, got %#v", source.Title, draft.DraftPayload)
	}
	if draft.DraftTitle != source.Title {
		t.Fatalf("expected draft title %q, got %q", source.Title, draft.DraftTitle)
	}
	if draft.DraftControlEffectiveness != source.ControlEffectiveness {
		t.Fatalf("expected draft control effectiveness %q, got %q", source.ControlEffectiveness, draft.DraftControlEffectiveness)
	}
	if draft.Status != RiskMonitoringStatusDraft {
		t.Fatalf("expected draft status, got %s", draft.Status)
	}
}
