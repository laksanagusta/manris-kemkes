package postgres_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestDashboardUsesLatestRiskVersionAvailableAsOfRequestedCycle(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewRiskRepository(pool)
	ctx := context.Background()

	orgID := uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO organizations (id, name) VALUES ($1, $2)`, orgID, "Dashboard Snapshot Org"); err != nil {
		t.Fatalf("insert organization: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM organizations WHERE id = $1`, orgID)
	})

	risk := &entity.Risk{
		Code:            "R-DASH-" + uuid.NewString()[:8],
		Title:           "H1 risk carried into H2 dashboard",
		Description:     "Latest available approved risk",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  uuid.New(),
		OrganizationID:  &orgID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   1,
		AssessmentCycle: "2026-H1",
		Probability:     4,
		Impact:          4,
		Weight:          entity.GetBobot(4, 4),
		Nilai:           entity.CalculateNilai(4, 4, entity.GetBobot(4, 4)),
		InherentScore:   int(entity.CalculateNilai(4, 4, entity.GetBobot(4, 4))),
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}
	if err := repo.Create(ctx, risk); err != nil {
		t.Fatalf("create risk: %v", err)
	}
	t.Cleanup(func() { _ = repo.Delete(context.Background(), risk.ID) })

	summary, err := repo.DashboardSummary(ctx, "2026-H2", []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("dashboard summary: %v", err)
	}
	if summary.TotalRisks != 1 {
		t.Fatalf("total risks = %d, want 1", summary.TotalRisks)
	}
	if summary.HighExtreme != 1 {
		t.Fatalf("high/extreme risks = %d, want 1", summary.HighExtreme)
	}

	heatmap, err := repo.HeatmapData(ctx, "2026-H2", []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("heatmap data: %v", err)
	}
	if len(heatmap) != 1 || heatmap[0].Count != 1 {
		t.Fatalf("heatmap = %#v, want one populated cell", heatmap)
	}

	topRisks, err := repo.TopRisks(ctx, "2026-H2", 5, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("top risks: %v", err)
	}
	if len(topRisks) != 1 || topRisks[0].ID != risk.ID {
		t.Fatalf("top risks = %#v, want risk %s", topRisks, risk.ID)
	}

	categories, err := repo.DashboardCategoryCounts(ctx, "2026-H2", []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("dashboard category counts: %v", err)
	}
	if len(categories) != 1 || categories[0].Count != 1 {
		t.Fatalf("categories = %#v, want one populated category", categories)
	}
}
