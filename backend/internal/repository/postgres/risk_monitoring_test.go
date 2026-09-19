package postgres_test

import (
	"context"
	"math"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
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
	monitoring.Conclusion = "Need follow-up"

	if err := monitoringRepo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring: %v", err)
	}
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

func TestRiskMonitoringRepositoryUsesReportedTaskProgress(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	riskRepo := postgres.NewRiskRepository(pool)
	monitoringRepo := postgres.NewRiskMonitoringRepository(pool)

	orgID := insertTestOrganization(t, pool, "Monitoring Progress Org")
	source := &entity.Risk{
		Code:            "R-MON-P-" + uuid.NewString()[:8],
		Title:           "Monitoring progress source",
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
		Mitigations: []entity.Mitigation{{
			Action: "Laporkan pelaksanaan mitigasi",
			Owner:  "PIC monitoring",
		}},
	}
	if err := riskRepo.Create(ctx, source); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM risks WHERE id = $1`, source.ID) })

	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", uuid.New())
	if err := monitoringRepo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM risk_monitorings WHERE id = $1`, monitoring.ID)
	})

	var mitigationID uuid.UUID
	if err := pool.QueryRow(ctx, `SELECT id FROM mitigations WHERE risk_id = $1 LIMIT 1`, source.ID).Scan(&mitigationID); err != nil {
		t.Fatalf("load mitigation: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO mitigation_tasks (
			mitigation_id, risk_id, monitoring_id, period_label, period_start, period_end, due_date,
			status, evidence_url, notes, reported_at, generated_by
		) VALUES ($1, $2, $3, '2026-H1', '2026-01-01', '2026-06-30', '2026-06-30',
			'done', 'https://example.com/evidence', 'Laporan pelaksanaan lengkap', now(), 'manual')
	`, mitigationID, source.ID, monitoring.ID); err != nil {
		t.Fatalf("create reported mitigation task: %v", err)
	}

	got, err := monitoringRepo.GetByID(ctx, monitoring.ID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.MitigationCompletionPercent != 100 {
		t.Fatalf("expected task-derived completion 100, got %d", got.MitigationCompletionPercent)
	}

	items, _, err := monitoringRepo.List(ctx, repository.RiskMonitoringListFilter{
		OrgIDs: []uuid.UUID{orgID},
		Query:  source.Code,
		Page:   1,
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(items) != 1 || items[0].MitigationCompletionPercent != 100 {
		t.Fatalf("expected list task-derived completion 100, got %#v", items)
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
		Mitigations: []entity.Mitigation{{
			Action: "Laporkan pelaksanaan mitigasi",
			Owner:  "PIC monitoring",
		}},
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
	var mitigationID uuid.UUID
	if err := pool.QueryRow(ctx, `SELECT id FROM mitigations WHERE risk_id = $1 LIMIT 1`, source.ID).Scan(&mitigationID); err != nil {
		t.Fatalf("load source mitigation: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO mitigation_tasks (
			mitigation_id, risk_id, monitoring_id, period_label, period_start, period_end, due_date, status, generated_by
		) VALUES ($1, $2, $3, '2026-H1', '2026-01-01', '2026-06-30', '2026-06-30', 'pending', 'manual')
	`, mitigationID, source.ID, monitoring.ID); err != nil {
		t.Fatalf("create monitoring mitigation task: %v", err)
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
	if stored.FinalizedAt == nil {
		t.Fatal("expected result risk finalized_at")
	}
	if stored.EffectiveFrom == nil {
		t.Fatal("expected result risk effective_from")
	}
	var taskStatus string
	if err := pool.QueryRow(ctx, `SELECT status FROM mitigation_tasks WHERE monitoring_id = $1`, monitoring.ID).Scan(&taskStatus); err != nil {
		t.Fatalf("load finalized mitigation task: %v", err)
	}
	if taskStatus != entity.MitigationTaskStatusNotReported {
		t.Fatalf("expected empty mitigation report to be terminal not_reported, got %q", taskStatus)
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

func TestRiskMonitoringRepositoryDeletesDraftWithinOrganizationScope(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	riskRepo := postgres.NewRiskRepository(pool)
	monitoringRepo := postgres.NewRiskMonitoringRepository(pool)

	orgID := insertTestOrganization(t, pool, "Monitoring Delete Org")
	source := &entity.Risk{
		Code:            "R-MON-D-" + uuid.NewString()[:8],
		Title:           "Monitoring delete source",
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

	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", uuid.New())
	if err := monitoringRepo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring: %v", err)
	}

	if err := monitoringRepo.DeleteDraft(ctx, monitoring.ID, []uuid.UUID{orgID}); err != nil {
		t.Fatalf("DeleteDraft: %v", err)
	}
	if _, err := monitoringRepo.GetByID(ctx, monitoring.ID, []uuid.UUID{orgID}); err == nil {
		t.Fatal("expected deleted monitoring draft to be unavailable")
	}

	// A finalized transaction is immutable and must not be deleted.
	finalized := entity.NewRiskMonitoringDraft(source, "2026-H2", uuid.New())
	if err := monitoringRepo.Create(ctx, finalized); err != nil {
		t.Fatalf("Create finalized monitoring: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM risk_monitorings WHERE id = $1`, finalized.ID)
	})
	if _, err := pool.Exec(ctx, `UPDATE risk_monitorings SET status = 'final' WHERE id = $1`, finalized.ID); err != nil {
		t.Fatalf("mark monitoring finalized: %v", err)
	}
	if err := monitoringRepo.DeleteDraft(ctx, finalized.ID, []uuid.UUID{orgID}); err != domainerrors.ErrMonitoringNotDeletable {
		t.Fatalf("DeleteDraft finalized error = %v, want %v", err, domainerrors.ErrMonitoringNotDeletable)
	}
}
