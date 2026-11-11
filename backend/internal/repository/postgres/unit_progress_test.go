package postgres_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestUnitProgressUsesEffectiveProfilesAndKeepsMissingTransactions(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	unit := insertTestOrganization(t, pool, "Progress "+uuid.NewString())
	empty := insertTestOrganization(t, pool, "Empty "+uuid.NewString())
	other := insertTestOrganization(t, pool, "Outside scope "+uuid.NewString())
	riskRepo := postgres.NewRiskRepository(pool)
	create := func(orgID uuid.UUID, cycle, status string) *entity.Risk {
		t.Helper()
		risk := &entity.Risk{
			Code: "UP-" + uuid.NewString()[:8], Title: "Progress fixture",
			Category: entity.RiskCategoryOperasional, Status: status, OrganizationID: &orgID,
			VersionGroupID: uuid.New(), IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1,
			AssessmentCycle: cycle, Probability: 3, Impact: 3,
		}
		if err := riskRepo.Create(ctx, risk); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = riskRepo.Delete(ctx, risk.ID) })
		return risk
	}
	draft := create(unit, "2024-Q2", "draft")
	carried := create(unit, "2024-Q1", "final")
	notStarted := create(unit, "2024-Q2", "final")
	future := create(unit, "2024-Q3", "final")
	outside := create(other, "2024-Q2", "final")
	var monitoringID uuid.UUID
	err := pool.QueryRow(ctx, `
		INSERT INTO risk_monitorings (version_group_id, source_risk_id, assessment_cycle, status, mode, source_version_number, source_probability, source_impact)
		VALUES ($1, $2, '2024-Q2', 'draft', 'with_profile_revision', 1, 3, 3) RETURNING id
	`, carried.VersionGroupID, carried.ID).Scan(&monitoringID)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(ctx, "DELETE FROM risk_monitorings WHERE id=$1", monitoringID) })

	start, end := service.QuarterlyPeriodBounds("2024-Q2")
	data, err := postgres.NewUnitProgressRepository(pool).ReadUnitProgress(ctx,
		repository.QuarterlyReportPeriod{Cycle: "2024-Q2", Start: start, End: end}, []uuid.UUID{unit, empty})
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Organizations) != 2 || len(data.Risks) != 3 {
		t.Fatalf("expected two units and three risks, got %+v", data)
	}
	risks := map[uuid.UUID]entity.UnitProgressRisk{}
	for _, row := range data.Risks {
		risks[row.ID] = row
	}
	if risks[draft.ID].Status != "draft" || risks[draft.ID].MonitoringID != nil ||
		risks[carried.ID].MonitoringStatus != "draft" || !risks[carried.ID].ProfileChanged ||
		risks[notStarted.ID].Status != "final" || risks[notStarted.ID].MonitoringID != nil ||
		risks[future.ID].ID != uuid.Nil || risks[outside.ID].ID != uuid.Nil {
		t.Fatalf("unexpected progress risks: %+v", risks)
	}
}
