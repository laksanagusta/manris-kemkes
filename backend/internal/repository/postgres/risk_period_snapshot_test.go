package postgres_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/repository/postgres"
	"github.com/manris/backend/internal/timeutil"
)

func TestRiskPeriodSnapshotsUseEffectiveFinalVersionsAndJakartaArchiveBoundary(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	orgID := insertTestOrganization(t, pool, "Period cutoff "+uuid.NewString())
	repo := postgres.NewRiskRepository(pool)
	reports := postgres.NewQuarterlyReportRepository(pool)
	group := uuid.New()
	base := &entity.Risk{Code: "CUTOFF-" + uuid.NewString()[:8], Title: "Period-end fixture", Category: entity.RiskCategoryOperasional, Status: "final", OrganizationID: &orgID, VersionGroupID: group, IsCurrent: false, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2025-Q1", Probability: 2, Impact: 2}
	if err := repo.Create(ctx, base); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, base.ID) })
	if _, err := pool.Exec(ctx, `UPDATE risks SET effective_from='2025-01-01', finalized_at='2025-01-02' WHERE id=$1`, base.ID); err != nil {
		t.Fatal(err)
	}
	newVersion := *base
	newVersion.ID, newVersion.VersionNumber, newVersion.AssessmentCycle, newVersion.IsCurrent = uuid.Nil, 2, "2025-Q2", true
	newVersion.Probability, newVersion.Impact = 4, 4
	if err := repo.Create(ctx, &newVersion); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, newVersion.ID) })
	if _, err := pool.Exec(ctx, `UPDATE risks SET effective_from='2025-06-01', finalized_at='2025-06-01', archived_at='2025-07-01 00:00:00+07', archived_reason='manual archive' WHERE id=$1`, newVersion.ID); err != nil {
		t.Fatal(err)
	}
	for _, tt := range []struct {
		cycle string
		id    uuid.UUID
		count int
	}{
		{"2025-Q1", base.ID, 1}, {"2025-Q2", newVersion.ID, 1}, {"2025-Q3", uuid.Nil, 0},
	} {
		t.Run(tt.cycle, func(t *testing.T) {
			items, err := repo.ListCycleSnapshot(ctx, tt.cycle, []uuid.UUID{orgID})
			if err != nil || len(items) != tt.count {
				t.Fatalf("snapshot count=%d want=%d error=%v", len(items), tt.count, err)
			}
			if tt.count > 0 && items[0].ID != tt.id {
				t.Fatalf("wrong effective version: %s want %s", items[0].ID, tt.id)
			}
			summary, err := repo.DashboardSummary(ctx, tt.cycle, []uuid.UUID{orgID})
			if err != nil || summary.TotalRisks != tt.count {
				t.Fatalf("dashboard=%+v want=%d error=%v", summary, tt.count, err)
			}
			start, end := service.QuarterlyPeriodBounds(tt.cycle)
			period, err := reports.LoadPeriod(ctx, tt.cycle, start, end, []uuid.UUID{orgID})
			if err != nil || len(period.Risks) != tt.count {
				t.Fatalf("report population mismatch: %+v %v", period, err)
			}
		})
	}
	// Backdating effectiveness cannot make a profile finalized after the cutoff
	// replace the profile that was already Final at that cutoff.
	if _, err := pool.Exec(ctx, `UPDATE risks SET finalized_at='2025-07-01 00:00:00+07' WHERE id=$1`, newVersion.ID); err != nil {
		t.Fatal(err)
	}
	items, err := repo.ListCycleSnapshot(ctx, "2025-Q2", []uuid.UUID{orgID})
	if err != nil || len(items) != 1 || items[0].ID != base.ID {
		t.Fatalf("late finalization must preserve previous Final profile: %+v %v", items, err)
	}
}

func TestRiskCurrentPeriodIgnoresDraftAndFutureEffectiveVersion(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	orgID := insertTestOrganization(t, pool, "Current cutoff "+uuid.NewString())
	repo := postgres.NewRiskRepository(pool)
	now := time.Now().In(timeutil.JakartaLocation())
	cycle := fmt.Sprintf("%d-Q%d", now.Year(), (int(now.Month())-1)/3+1)
	risk := &entity.Risk{Code: "NOW-" + uuid.NewString()[:8], Title: "Current fixture", Category: entity.RiskCategoryOperasional, Status: "final", OrganizationID: &orgID, VersionGroupID: uuid.New(), IsCurrent: false, IsCycleCurrent: false, VersionNumber: 1, AssessmentCycle: cycle, Probability: 2, Impact: 2}
	if err := repo.Create(ctx, risk); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, risk.ID) })
	if _, err := pool.Exec(ctx, `UPDATE risks SET effective_from=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date-1, finalized_at=CURRENT_TIMESTAMP-interval '1 day' WHERE id=$1`, risk.ID); err != nil {
		t.Fatal(err)
	}
	future := *risk
	future.ID, future.VersionNumber, future.IsCurrent = uuid.Nil, 2, true
	future.IsCycleCurrent = true
	if err := repo.Create(ctx, &future); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, future.ID) })
	if _, err := pool.Exec(ctx, `UPDATE risks SET effective_from=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date+1, finalized_at=CURRENT_TIMESTAMP WHERE id=$1`, future.ID); err != nil {
		t.Fatal(err)
	}
	draft := *risk
	draft.ID, draft.VersionGroupID, draft.Status = uuid.Nil, uuid.New(), "draft"
	if err := repo.Create(ctx, &draft); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, draft.ID) })
	items, err := repo.ListCycleSnapshot(ctx, cycle, []uuid.UUID{orgID})
	if err != nil || len(items) != 1 || items[0].ID != risk.ID {
		t.Fatalf("must use current effective Final version only: %+v %v", items, err)
	}
	summary, err := repo.DashboardSummary(ctx, cycle, []uuid.UUID{orgID})
	if err != nil || summary.TotalRisks != 1 {
		t.Fatalf("current dashboard=%+v %v", summary, err)
	}
	start, end := service.QuarterlyPeriodBounds(cycle)
	period, err := postgres.NewQuarterlyReportRepository(pool).LoadPeriod(ctx, cycle, start, end, []uuid.UUID{orgID})
	if err != nil || len(period.Risks) != 1 || period.Risks[0].ID != risk.ID {
		t.Fatalf("running report must use today's effective profile: %+v %v", period, err)
	}
}
