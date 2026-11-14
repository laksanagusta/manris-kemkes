package risk

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"testing"
	"time"
)

func TestDatedMonitoringMutationsOutsideLegacyQuarterWindow(t *testing.T) {
	org, id, mid := uuid.New(), uuid.New(), uuid.New()
	source := &entity.Risk{ID: id, Code: "R-DATED", Title: "Risiko", Description: "Deskripsi risiko", Category: entity.RiskCategoryOperasional, VersionGroupID: uuid.New(), Status: "final", IsCurrent: true, IsCycleCurrent: true, AssessmentCycle: "2026-Q3", OrganizationID: &org, Probability: 2, Impact: 2, TargetProbability: 1, TargetImpact: 1}
	source.CalculateAll()
	risks := &fakeMonitoringRiskRepoForUsecase{risks: map[uuid.UUID]*entity.Risk{id: source}}
	repo := newFakeMonitoringTransactionRepo()
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-Q3", uuid.New())
	monitoring.ID = mid
	monitoring.ObservedAt = "2026-09-15"
	repo.byID[mid] = monitoring
	closed := func() time.Time { return time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC) }
	start := NewStartMonitoringUseCase(risks, repo, nil, nil, &fakeMonitoringPeriodRepo{})
	start.now = closed
	if _, err := start.Execute(context.Background(), StartMonitoringInput{SourceRiskID: id, ObservedAt: "2026-09-15", OrgIDs: []uuid.UUID{org}}); err != nil {
		t.Fatalf("start outside legacy window: %v", err)
	}
	update := NewUpdateMonitoringUseCase(risks, repo)
	update.now = closed
	if _, err := update.Execute(context.Background(), UpdateMonitoringInput{MonitoringID: mid, OrgIDs: []uuid.UUID{org}}); err != nil {
		t.Fatalf("update outside legacy window: %v", err)
	}
	final := NewFinalizeMonitoringUseCase(risks, repo, nil, nil)
	final.now = closed
	if _, err := final.Execute(context.Background(), FinalizeMonitoringInput{MonitoringID: mid, OrgIDs: []uuid.UUID{org}}); err != nil {
		t.Fatalf("finalize outside legacy window: %v", err)
	}
	delRepo := &deleteMonitoringRepoStub{monitoring: monitoring}
	del := NewDeleteMonitoringUseCase(delRepo)
	del.now = closed
	if _, err := del.Execute(context.Background(), mid, []uuid.UUID{org}); err != nil || !delRepo.deleted {
		t.Fatalf("delete draft outside legacy window: %v", err)
	}
}
