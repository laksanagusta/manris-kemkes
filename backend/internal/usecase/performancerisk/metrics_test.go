package performancerisk

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func mustUUID(t *testing.T, value string) uuid.UUID {
	t.Helper()

	id, err := uuid.Parse(value)
	if err != nil {
		t.Fatalf("parse uuid %q: %v", value, err)
	}
	return id
}

func TestBuildNodeMetricsUsesInherentScoreOnly(t *testing.T) {
	roID := mustUUID(t, "11111111-1111-1111-1111-111111111111")
	now := time.Date(2026, time.May, 24, 0, 0, 0, 0, time.UTC)

	risks := []*entity.PerformanceRiskRiskRow{
		{
			ID:                     mustUUID(t, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
			ROID:                   &roID,
			Code:                   "R-001",
			Title:                  "Risiko dengan skor bawaan rendah",
			OrganizationName:       "Unit A",
			Probability:            5,
			Impact:                 5,
			InherentScore:          9,
			MitigationDoneCount:    1,
			MitigationPendingCount: 1,
			MitigationDueDates: []string{
				"2026-01-01",
			},
		},
		{
			ID:                     mustUUID(t, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
			ROID:                   &roID,
			Code:                   "R-002",
			Title:                  "Risiko dengan skor bawaan tinggi",
			OrganizationName:       "Unit A",
			Probability:            1,
			Impact:                 1,
			InherentScore:          20,
			MitigationDoneCount:    1,
			MitigationOverdueCount: 1,
			MitigationDueDates: []string{
				"2026-12-31",
			},
		},
	}

	got := BuildNodeMetrics(risks, now)

	if got.RiskCount != 2 {
		t.Fatalf("RiskCount = %d, want 2", got.RiskCount)
	}
	if got.TotalExposure != 29 {
		t.Fatalf("TotalExposure = %d, want 29", got.TotalExposure)
	}
	if got.AvgExposure != 14.5 {
		t.Fatalf("AvgExposure = %v, want 14.5", got.AvgExposure)
	}
	if got.HighestInherentScore != 20 {
		t.Fatalf("HighestInherentScore = %d, want 20", got.HighestInherentScore)
	}
	if got.HighestLevel != entity.RiskLevelSangatTinggi {
		t.Fatalf("HighestLevel = %q, want %q", got.HighestLevel, entity.RiskLevelSangatTinggi)
	}
	if got.HighExtremeCount != 1 {
		t.Fatalf("HighExtremeCount = %d, want 1", got.HighExtremeCount)
	}
	if got.Heatmap[4][4] != 1 {
		t.Fatalf("Heatmap[4][4] = %d, want 1", got.Heatmap[4][4])
	}
	if got.Heatmap[0][0] != 1 {
		t.Fatalf("Heatmap[0][0] = %d, want 1", got.Heatmap[0][0])
	}
	if got.MitigationTotal != 2 {
		t.Fatalf("MitigationTotal = %d, want 2", got.MitigationTotal)
	}
	if got.MitigationProgressDone != 2 {
		t.Fatalf("MitigationProgressDone = %d, want 2", got.MitigationProgressDone)
	}
	if got.MitigationProgressPending != 1 {
		t.Fatalf("MitigationProgressPending = %d, want 1", got.MitigationProgressPending)
	}
	if got.MitigationProgressOverdue != 1 {
		t.Fatalf("MitigationProgressOverdue = %d, want 1", got.MitigationProgressOverdue)
	}
	if got.MitigationProgressTotal != 4 {
		t.Fatalf("MitigationProgressTotal = %d, want 4", got.MitigationProgressTotal)
	}
	if got.MitigationProgressPercent != 50 {
		t.Fatalf("MitigationProgressPercent = %v, want 50", got.MitigationProgressPercent)
	}
	if got.MitigationOverdue != 1 {
		t.Fatalf("MitigationOverdue = %d, want 1", got.MitigationOverdue)
	}
	if got.MitigationPending != 1 {
		t.Fatalf("MitigationPending = %d, want 1", got.MitigationPending)
	}
	if got.AttentionStatus != entity.PerformanceRiskAttentionCritical {
		t.Fatalf("AttentionStatus = %q, want %q", got.AttentionStatus, entity.PerformanceRiskAttentionCritical)
	}
}

func TestBuildNodeMetricsClassifiesNoRiskWatchAndStable(t *testing.T) {
	now := time.Date(2026, time.May, 24, 0, 0, 0, 0, time.UTC)

	empty := BuildNodeMetrics(nil, now)
	if empty.AttentionStatus != entity.PerformanceRiskAttentionNoRisk {
		t.Fatalf("empty AttentionStatus = %q, want %q", empty.AttentionStatus, entity.PerformanceRiskAttentionNoRisk)
	}

	roID := mustUUID(t, "11111111-1111-1111-1111-111111111111")
	watch := BuildNodeMetrics([]*entity.PerformanceRiskRiskRow{
		{
			ID:                     mustUUID(t, "cccccccc-cccc-cccc-cccc-cccccccccccc"),
			ROID:                   &roID,
			Code:                   "R-003",
			Title:                  "Risiko overdue",
			OrganizationName:       "Unit B",
			Probability:            3,
			Impact:                 3,
			InherentScore:          9,
			MitigationOverdueCount: 1,
			MitigationDueDates: []string{
				"2026-01-01",
			},
		},
	}, now)
	if watch.AttentionStatus != entity.PerformanceRiskAttentionWatch {
		t.Fatalf("watch AttentionStatus = %q, want %q", watch.AttentionStatus, entity.PerformanceRiskAttentionWatch)
	}

	stable := BuildNodeMetrics([]*entity.PerformanceRiskRiskRow{
		{
			ID:                     mustUUID(t, "dddddddd-dddd-dddd-dddd-dddddddddddd"),
			ROID:                   &roID,
			Code:                   "R-004",
			Title:                  "Risiko aman",
			OrganizationName:       "Unit C",
			Probability:            2,
			Impact:                 2,
			InherentScore:          6,
			MitigationPendingCount: 1,
			MitigationDueDates: []string{
				"2026-12-31",
			},
		},
	}, now)
	if stable.AttentionStatus != entity.PerformanceRiskAttentionStable {
		t.Fatalf("stable AttentionStatus = %q, want %q", stable.AttentionStatus, entity.PerformanceRiskAttentionStable)
	}
}

func TestBuildNodeMetricsCountsPendingAndIgnoresBlankDueDates(t *testing.T) {
	now := time.Date(2026, time.May, 24, 0, 0, 0, 0, time.UTC)
	roID := mustUUID(t, "11111111-1111-1111-1111-111111111111")

	got := BuildNodeMetrics([]*entity.PerformanceRiskRiskRow{
		{
			ID:                     mustUUID(t, "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
			ROID:                   &roID,
			Code:                   "R-005",
			Title:                  "Risiko pending",
			OrganizationName:       "Unit D",
			Probability:            1,
			Impact:                 2,
			InherentScore:          2,
			MitigationPendingCount: 1,
			MitigationDueDates: []string{
				"2026-06-01",
				"",
			},
		},
	}, now)

	if got.MitigationTotal != 1 {
		t.Fatalf("MitigationTotal = %d, want 1", got.MitigationTotal)
	}
	if got.MitigationPending != 1 {
		t.Fatalf("MitigationPending = %d, want 1", got.MitigationPending)
	}
	if got.MitigationOverdue != 0 {
		t.Fatalf("MitigationOverdue = %d, want 0", got.MitigationOverdue)
	}
	if got.MitigationProgressPending != 1 {
		t.Fatalf("MitigationProgressPending = %d, want 1", got.MitigationProgressPending)
	}
	if got.MitigationProgressTotal != 1 {
		t.Fatalf("MitigationProgressTotal = %d, want 1", got.MitigationProgressTotal)
	}
	if got.MitigationProgressPercent != 0 {
		t.Fatalf("MitigationProgressPercent = %v, want 0", got.MitigationProgressPercent)
	}
}
