package postgres

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"testing"
)

func TestMonitoringResultReadPreservesSubstanceBaseline(t *testing.T) {
	id := uuid.New()
	base := entity.WorkingPaperRiskData{ID: id, Probability: 3, Impact: 3, Bobot: 1.43, Nilai: 12.87, Title: "Baseline"}
	link := entity.WorkingPaperRiskLink{Risk: base, ResultRiskID: &id}
	link.Risk.Monitoring = &entity.WorkingPaperRiskMonitoring{Status: "final", ObservedProbability: 1, ObservedImpact: 1, ObservedWeight: 1, ObservedNilai: 1}
	result := sameVersionMonitoringResult(link)
	if result == nil || result.Nilai != 1 || result.Probability != 1 || result.VersionNumber != base.VersionNumber {
		t.Fatalf("wrong final same-version result: %+v", result)
	}
	if link.Risk.Nilai != 12.87 || link.Risk.Probability != 3 {
		t.Fatal("baseline changed")
	}
	link.Risk.Monitoring.Status = "draft"
	if sameVersionMonitoringResult(link) != nil {
		t.Fatal("draft leaked")
	}
	other := uuid.New()
	link.Risk.Monitoring.Status = "final"
	link.ResultRiskID = &other
	if sameVersionMonitoringResult(link) != nil {
		t.Fatal("different profile version must use own persisted substance")
	}
}
