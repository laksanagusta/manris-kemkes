package postgres_test

import (
	"context"
	"math"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestRiskMonitoringRepositoryCreatesAndLoadsDraft(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	riskRepo := postgres.NewRiskRepository(pool)
	monitoringRepo := postgres.NewRiskMonitoringRepository(pool)

	orgID := insertTestOrganization(t, pool, "Monitoring Repo Test Org")
	source := &entity.Risk{
		Code:            "R-MON-" + uuid.NewString()[:8],
		Title:           "Monitoring source",
		Description:     "Approved source risk",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  uuid.New(),
		OrganizationID:  &orgID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   1,
		AssessmentCycle: "2025-H2",
		Probability:     3,
		Impact:          4,
		Weight:          entity.GetBobot(3, 4),
		Nilai:           entity.CalculateNilai(3, 4, entity.GetBobot(3, 4)),
		InherentScore:   int(entity.CalculateNilai(3, 4, entity.GetBobot(3, 4))),
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}
	if err := riskRepo.Create(ctx, source); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM risks WHERE id = $1`, source.ID) })

	startedBy := uuid.New()
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", startedBy)
	monitoring.ObservedProbability = 5
	monitoring.ObservedImpact = 5
	monitoring.CalculateObservedScore()
	monitoring.ConditionSummary = "Observed condition"
	monitoring.Conclusion = "Need follow-up"

	if err := monitoringRepo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM risk_monitorings WHERE id = $1`, monitoring.ID)
	})

	got, err := monitoringRepo.GetByID(ctx, monitoring.ID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.SourceRiskID != source.ID {
		t.Fatalf("expected source risk %s, got %s", source.ID, got.SourceRiskID)
	}
	if got.SourceNilai != math.Round(source.Nilai) {
		t.Fatalf("expected source nilai %v, got %v", math.Round(source.Nilai), got.SourceNilai)
	}
	if got.SourceVersionNumber != source.VersionNumber {
		t.Fatalf("expected source version %d, got %d", source.VersionNumber, got.SourceVersionNumber)
	}
	if got.DraftPayload == nil || got.DraftPayload.Title != source.Title {
		t.Fatalf("expected draft payload title %q, got %#v", source.Title, got.DraftPayload)
	}
}

func TestRiskMonitoringRepositoryFinalizesAndLinksResultRisk(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	riskRepo := postgres.NewRiskRepository(pool)
	monitoringRepo := postgres.NewRiskMonitoringRepository(pool)

	orgID := insertTestOrganization(t, pool, "Monitoring Repo Finalize Org")
	source := &entity.Risk{
		Code:            "R-MON-F-" + uuid.NewString()[:8],
		Title:           "Monitoring finalize source",
		Description:     "Approved source risk",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  uuid.New(),
		OrganizationID:  &orgID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   2,
		AssessmentCycle: "2025-H2",
		Probability:     3,
		Impact:          4,
		Weight:          entity.GetBobot(3, 4),
		Nilai:           entity.CalculateNilai(3, 4, entity.GetBobot(3, 4)),
		InherentScore:   int(entity.CalculateNilai(3, 4, entity.GetBobot(3, 4))),
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}
	if err := riskRepo.Create(ctx, source); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM risks WHERE id = $1`, source.ID) })

	startedBy := uuid.New()
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", startedBy)
	monitoring.ObservedProbability = 4
	monitoring.ObservedImpact = 5
	monitoring.CalculateObservedScore()
	monitoring.Mode = entity.RiskMonitoringModeScoreOnly
	if err := monitoringRepo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring: %v", err)
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
		t.Fatalf("Finalize: %v", err)
	}
	if finalized.ResultRiskID == nil {
		t.Fatal("expected result risk id")
	}
	if finalized.Status != entity.RiskMonitoringStatusFinalized {
		t.Fatalf("expected finalized status, got %s", finalized.Status)
	}
	if finalized.FinalizedAt == nil {
		t.Fatal("expected finalized_at")
	}

	stored, err := riskRepo.GetByID(ctx, *finalized.ResultRiskID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("GetByID result risk: %v", err)
	}
	if !stored.IsCurrent || !stored.IsCycleCurrent {
		t.Fatal("expected result risk to be current and cycle-current")
	}
}

func TestRiskMonitoringRepositoryRejectsInvalidCycleDraftQuery(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewRiskMonitoringRepository(pool)
	ctx := context.Background()

	got, err := repo.GetDraftBySourceAndCycle(ctx, uuid.New(), "2026-H1")
	if err != nil {
		t.Fatalf("GetDraftBySourceAndCycle: %v", err)
	}
	if got != nil {
		t.Fatal("expected nil draft for missing source/cycle")
	}
}
