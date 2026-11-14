package risk

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"testing"
	"time"
)

func TestObservationDateUsesJakartaCalendarAndDerivesQuarter(t *testing.T) {
	now := time.Date(2027, 3, 31, 18, 0, 0, 0, time.UTC) // April 1 in Jakarta.
	for _, tt := range []struct {
		date, cycle string
		valid       bool
	}{
		{"", "2027-Q2", true}, {"2027-02-05", "2027-Q1", true}, {"2027-04-01", "2027-Q2", true},
		{"2027-04-02", "", false}, {"2027-02-30", "", false}, {"2027-4-1", "", false},
	} {
		t.Run(tt.date, func(t *testing.T) {
			date, cycle, err := monitoringObservationDate(tt.date, now)
			if (err == nil) != tt.valid {
				t.Fatalf("date=%s err=%v", date, err)
			}
			if tt.valid && cycle != tt.cycle {
				t.Fatalf("cycle %s want %s", cycle, tt.cycle)
			}
		})
	}
}

func TestStartMonitoringAllowsAnotherFinalInSameQuarter(t *testing.T) {
	id, group := uuid.New(), uuid.New()
	source := &entity.Risk{ID: id, VersionGroupID: group, IsCurrent: true, Status: "final", Probability: 2, Impact: 3, AssessmentCycle: "2027-Q1"}
	source.CalculateAll()
	repo := newFakeMonitoringTransactionRepo()
	repo.byVersionGroup[group.String()+"|2027-Q1"] = &entity.RiskMonitoring{ID: uuid.New(), Status: "final", ObservedAt: "2027-02-05"}
	uc := NewStartMonitoringUseCase(&fakeMonitoringRiskRepoForUsecase{risks: map[uuid.UUID]*entity.Risk{id: source}}, repo, nil, nil, &fakeMonitoringPeriodRepo{})
	uc.now = func() time.Time { return time.Date(2027, 3, 8, 0, 0, 0, 0, time.UTC) }
	out, err := uc.Execute(context.Background(), StartMonitoringInput{SourceRiskID: id, ObservedAt: "2027-03-08"})
	if err != nil {
		t.Fatal(err)
	}
	if out.ExistingDraft || len(repo.created) != 1 || out.Monitoring.ObservedAt != "2027-03-08" || out.Monitoring.AssessmentCycle != "2027-Q1" {
		t.Fatalf("unexpected new observation: %#v", out)
	}
}

func TestFinalizeMonitoringRetryReturnsExistingWithoutNewVersion(t *testing.T) {
	id := uuid.New()
	repo := newFakeMonitoringTransactionRepo()
	repo.byID[id] = &entity.RiskMonitoring{ID: id, Status: "final", ObservedAt: "2027-02-05"}
	uc := NewFinalizeMonitoringUseCase(&fakeMonitoringRiskRepoForUsecase{}, repo, nil, nil)
	if _, err := uc.Execute(context.Background(), FinalizeMonitoringInput{MonitoringID: id}); err != nil {
		t.Fatal(err)
	}
	if len(repo.finalizedR) != 0 {
		t.Fatal("retry generated a second result")
	}
}
