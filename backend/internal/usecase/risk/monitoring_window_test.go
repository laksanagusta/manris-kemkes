package risk

import (
	"context"
	stderrors "errors"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
	"testing"
	"time"
)

func TestMonitoringMutationsLockedOutsideWindow(t *testing.T) {
	org, id, mid := uuid.New(), uuid.New(), uuid.New()
	source := &entity.Risk{ID: id, VersionGroupID: uuid.New(), Status: "final", IsCurrent: true, IsCycleCurrent: true, AssessmentCycle: "2026-Q3", OrganizationID: &org}
	risks := &fakeMonitoringRiskRepoForUsecase{risks: map[uuid.UUID]*entity.Risk{id: source}}
	repo := newFakeMonitoringTransactionRepo()
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-Q3", uuid.New())
	monitoring.ID = mid
	repo.byID[mid] = monitoring
	repo.drafts[source.VersionGroupID.String()+"|2026-Q3"] = monitoring
	closed := func() time.Time { return time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC) }
	start := NewStartMonitoringUseCase(risks, repo, nil, nil, &fakeMonitoringPeriodRepo{})
	start.now = closed
	update := NewUpdateMonitoringUseCase(risks, repo)
	update.now = closed
	final := NewFinalizeMonitoringUseCase(risks, repo, nil, nil)
	final.now = closed
	for name, run := range map[string]func() error{
		"start or resume": func() error {
			_, err := start.Execute(context.Background(), StartMonitoringInput{SourceRiskID: id, Cycle: "2026-Q3", OrgIDs: []uuid.UUID{org}})
			return err
		},
		"update": func() error {
			_, err := update.Execute(context.Background(), UpdateMonitoringInput{MonitoringID: mid, OrgIDs: []uuid.UUID{org}})
			return err
		},
		"finalize": func() error {
			_, err := final.Execute(context.Background(), FinalizeMonitoringInput{MonitoringID: mid, OrgIDs: []uuid.UUID{org}})
			return err
		},
	} {
		t.Run(name, func(t *testing.T) {
			if err := run(); !stderrors.Is(err, apperrors.ErrMonitoringWindowClosed) {
				t.Fatalf("expected window lock, got %v", err)
			}
		})
	}
	delRepo := &deleteMonitoringRepoStub{monitoring: monitoring}
	del := NewDeleteMonitoringUseCase(delRepo)
	del.now = closed
	if _, err := del.Execute(context.Background(), mid, []uuid.UUID{org}); !stderrors.Is(err, apperrors.ErrMonitoringWindowClosed) || delRepo.deleted {
		t.Fatalf("delete bypassed lock: %v", err)
	}
}
