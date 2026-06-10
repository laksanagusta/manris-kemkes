package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/repository/postgres"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestRiskListRegisterMonitoringTransactionsIncludesBeforeAndAfterNilai(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewRiskRepository(pool)
	ctx := context.Background()

	versionGroupID := uuid.New()
	orgID := uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO organizations (id, name) VALUES ($1, $2)`, orgID, "Monitoring Register Test Org"); err != nil {
		t.Fatalf("Insert organization: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM organizations WHERE id = $1`, orgID)
	})
	source := &entity.Risk{
		Code:            "R-MON-" + uuid.NewString()[:8],
		Title:           "Monitoring transaction source",
		Description:     "Approved source risk",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  versionGroupID,
		OrganizationID:  &orgID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   1,
		AssessmentCycle: "2025-H2",
		Probability:     1,
		Impact:          1,
		Weight:          1.0,
		Nilai:           1,
		InherentScore:   1,
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}

	if err := repo.Create(ctx, source); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, source.ID) })

	monitoring := riskuc.BuildPeriodicReassessmentDraft(
		source,
		"2026-H1",
		time.Date(2026, time.January, 10, 9, 0, 0, 0, time.UTC),
		uuid.Nil,
	)
	monitoring.Status = entity.RiskStatusApproved
	monitoring.IsCurrent = false
	monitoring.IsCycleCurrent = true
	monitoring.VersionNumber = 2
	monitoring.Probability = 5
	monitoring.Impact = 5
	monitoring.Nilai = 25
	monitoring.InherentScore = 25
	monitoring.OrganizationID = &orgID

	if err := repo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring risk: %v", err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, monitoring.ID) })

	items, total, err := repo.ListRegister(ctx, repository.RiskRegisterFilter{
		View:            "monitoring-transactions",
		Lifecycle:       "active",
		AssessmentCycle: "2026-H1",
		OrgIDs:          []uuid.UUID{orgID},
		Page:            1,
		Limit:           20,
	})
	if err != nil {
		t.Fatalf("ListRegister: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected total 1, got %d", total)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 row, got %d", len(items))
	}
	if items[0].VersionNumber <= 1 {
		t.Fatalf("expected monitoring row to have version > 1, got %d", items[0].VersionNumber)
	}
	if items[0].PreviousRiskID == nil {
		t.Fatal("expected monitoring row to keep previous_risk_id")
	}
	if items[0].BeforeMonitoringNilai == nil || *items[0].BeforeMonitoringNilai != 1 {
		if items[0].BeforeMonitoringNilai == nil {
			t.Fatal("expected beforeMonitoringNilai to be populated")
		}
		t.Fatalf("expected beforeMonitoringNilai 1, got %v", *items[0].BeforeMonitoringNilai)
	}
	if items[0].MonitoringResultNilai == nil || *items[0].MonitoringResultNilai != 25 {
		if items[0].MonitoringResultNilai == nil {
			t.Fatal("expected monitoringResultNilai to be populated")
		}
		t.Fatalf("expected monitoringResultNilai 25, got %v", *items[0].MonitoringResultNilai)
	}
}

func TestRiskListRegisterIncludesMonitoringStatusAndLastMonitoredAt(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewRiskRepository(pool)
	monitoringRepo := postgres.NewRiskMonitoringRepository(pool)
	ctx := context.Background()

	orgID := uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO organizations (id, name) VALUES ($1, $2)`, orgID, "Monitoring Status Org"); err != nil {
		t.Fatalf("Insert organization: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM organizations WHERE id = $1`, orgID)
	})

	source := &entity.Risk{
		Code:            "R-MON-STATUS-" + uuid.NewString()[:8],
		Title:           "Monitoring status source",
		Description:     "Approved source risk",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  uuid.New(),
		OrganizationID:  &orgID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   1,
		AssessmentCycle: "2026-H1",
		Probability:     2,
		Impact:          3,
		Weight:          entity.GetBobot(2, 3),
		Nilai:           entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
		InherentScore:   int(entity.CalculateNilai(2, 3, entity.GetBobot(2, 3))),
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}
	if err := repo.Create(ctx, source); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, source.ID) })

	startedBy := uuid.New()
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", startedBy)
	monitoring.ObservedProbability = 4
	monitoring.ObservedImpact = 4
	monitoring.CalculateObservedScore()
	monitoring.ConditionSummary = "Observed condition"
	monitoring.Conclusion = "Need follow-up"
	if err := monitoringRepo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring draft: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM risk_monitorings WHERE id = $1`, monitoring.ID)
	})

	result := *source
	result.ID = uuid.Nil
	result.Status = entity.RiskStatusApproved
	result.IsCurrent = true
	result.IsCycleCurrent = true
	result.VersionNumber = source.VersionNumber + 1
	result.Probability = monitoring.ObservedProbability
	result.Impact = monitoring.ObservedImpact
	result.Weight = monitoring.ObservedWeight
	result.Nilai = monitoring.ObservedNilai
	result.InherentScore = int(monitoring.ObservedNilai)

	finalized, err := monitoringRepo.Finalize(ctx, monitoring.ID, &result, uuid.New())
	if err != nil {
		t.Fatalf("Finalize monitoring: %v", err)
	}
	if finalized.FinalizedAt == nil {
		t.Fatal("expected finalized_at on monitoring row")
	}

	items, total, err := repo.ListRegister(ctx, repository.RiskRegisterFilter{
		OrgIDs: []uuid.UUID{orgID},
		Page:   1,
		Limit:  20,
	})
	if err != nil {
		t.Fatalf("ListRegister: %v", err)
	}
	if total == 0 || len(items) == 0 {
		t.Fatalf("expected at least one register row, got total=%d len=%d", total, len(items))
	}

	found := false
	for _, item := range items {
		if item.Code != source.Code {
			continue
		}
		found = true
		if item.MonitoringStatus == nil || *item.MonitoringStatus != entity.RiskMonitoringStatusFinalized {
			t.Fatalf("expected monitoring status finalized, got %#v", item.MonitoringStatus)
		}
		if item.LastMonitoredAt == nil {
			t.Fatal("expected lastMonitoredAt to be populated")
		}
		break
	}
	if !found {
		t.Fatalf("expected register row for code %s", source.Code)
	}
}
