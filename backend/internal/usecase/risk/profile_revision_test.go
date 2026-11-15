package risk

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"testing"
	"time"
)

func TestBuildProfileRevisionDraft(t *testing.T) {
	source := &entity.Risk{ID: uuid.New(), VersionGroupID: uuid.New(), VersionNumber: 2, Status: "final", IsCurrent: true, Probability: 3, Impact: 3, Mitigations: []entity.Mitigation{{ID: uuid.New(), Action: "Existing plan", ExecutionScheduleText: "Setiap bulan"}}}
	source.CurrentAssessment = &entity.RiskCurrentAssessment{Probability: 2, Impact: 3, Weight: 1, Nilai: 6}
	draft := BuildProfileRevisionDraft(source, "Koreksi pengendalian", uuid.New(), time.Now())
	if draft.Status != "draft" || draft.IsCurrent || draft.VersionNumber != 3 || draft.PreviousRiskID == nil || *draft.PreviousRiskID != source.ID {
		t.Fatalf("invalid draft lineage: %+v", draft)
	}
	if draft.ReviewType != "revision" || draft.ChangeReason != "Koreksi pengendalian" {
		t.Fatal("revision context lost")
	}
	if draft.Probability != 2 || draft.Impact != 3 {
		t.Fatal("revision must start from latest operational score")
	}
	if draft.Mitigations[0].ID != source.Mitigations[0].ID || draft.Mitigations[0].ExecutionScheduleText != "Setiap bulan" {
		t.Fatal("plan lineage/schedule lost")
	}
	if draft.FinalizedAt != nil || draft.FinalizedBy != nil {
		t.Fatal("draft inherited finalization")
	}
	draft.Mitigations[0].Action = "Changed"
	if source.Mitigations[0].Action != "Existing plan" {
		t.Fatal("draft mutated active profile")
	}
}
