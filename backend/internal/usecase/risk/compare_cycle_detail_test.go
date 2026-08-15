package risk

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestCompareRiskCycleDetailsUseCase_ExecuteReturnsDetailedChanges(t *testing.T) {
	changedGroupID := uuid.New()
	stableGroupID := uuid.New()
	removedGroupID := uuid.New()
	addedGroupID := uuid.New()

	repo := &fakeReassessRiskRepo{}
	repo.listCycleSnapshot = func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
		switch cycle {
		case "2025-Q4":
			return []*entity.Risk{
				{
					ID:             uuid.New(),
					VersionGroupID: changedGroupID,
					Code:           "R-001",
					Title:          "Distribusi vaksin terlambat",
					OrgName:        "Dit. Surveilans",
					Description:    "Versi awal",
					Probability:    3,
					Impact:         4,
					InherentScore:  12,
					Cause:          []string{"Vendor tunggal"},
					Mitigations: []entity.Mitigation{{
						Action:    "Koordinasi vendor A",
						Owner:     "Tim logistik",
						Frequency: "rutin",
						SortOrder: 1,
					}},
				},
				{
					ID:             uuid.New(),
					VersionGroupID: stableGroupID,
					Code:           "R-002",
					Title:          "Kegagalan backup data",
					OrgName:        "Pusdatin",
					Description:    "Tetap sama",
					Probability:    2,
					Impact:         3,
					InherentScore:  6,
				},
				{
					ID:             uuid.New(),
					VersionGroupID: removedGroupID,
					Code:           "R-003",
					Title:          "Risiko lama",
					OrgName:        "Dit. Imunisasi",
					Probability:    2,
					Impact:         2,
					InherentScore:  4,
				},
			}, nil
		case "2026-Q2":
			return []*entity.Risk{
				{
					ID:             uuid.New(),
					VersionGroupID: changedGroupID,
					Code:           "R-001",
					Title:          "Distribusi vaksin terlambat",
					OrgName:        "Dit. Surveilans",
					Description:    "Versi revisi",
					Probability:    4,
					Impact:         4,
					InherentScore:  16,
					Cause:          []string{"Vendor tunggal", "Cuaca buruk"},
					Mitigations: []entity.Mitigation{{
						Action:    "Koordinasi vendor A dan B",
						Owner:     "Tim logistik",
						Frequency: "rutin",
						SortOrder: 1,
					}},
					ChangeReason: "Semester baru",
				},
				{
					ID:             uuid.New(),
					VersionGroupID: stableGroupID,
					Code:           "R-002",
					Title:          "Kegagalan backup data",
					OrgName:        "Pusdatin",
					Description:    "Tetap sama",
					Probability:    2,
					Impact:         3,
					InherentScore:  6,
				},
				{
					ID:             uuid.New(),
					VersionGroupID: addedGroupID,
					Code:           "R-004",
					Title:          "Risiko baru",
					OrgName:        "Dit. Imunisasi",
					Probability:    5,
					Impact:         4,
					InherentScore:  20,
				},
			}, nil
		default:
			return nil, nil
		}
	}

	uc := NewCompareRiskCycleDetailsUseCase(repo, nil)
	report, err := uc.Execute(context.Background(), CompareRiskCycleDetailsInput{
		FromCycle: "2025-Q4",
		ToCycle:   "2026-Q2",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if report == nil || report.Summary == nil {
		t.Fatal("expected report summary")
	}
	if report.Summary.ChangedCount != 1 {
		t.Fatalf("expected 1 changed risk, got %d", report.Summary.ChangedCount)
	}
	if report.Summary.AddedCount != 1 {
		t.Fatalf("expected 1 added risk, got %d", report.Summary.AddedCount)
	}
	if report.Summary.RemovedCount != 1 {
		t.Fatalf("expected 1 removed risk, got %d", report.Summary.RemovedCount)
	}
	if report.Summary.StableCount != 1 {
		t.Fatalf("expected 1 stable risk, got %d", report.Summary.StableCount)
	}
	if len(report.Items) != 3 {
		t.Fatalf("expected 3 visible items without stable rows, got %d", len(report.Items))
	}

	var changed *entity.RiskCycleDetailedComparisonItem
	for _, item := range report.Items {
		if item.ChangeCategory == "changed" {
			changed = item
			break
		}
	}
	if changed == nil {
		t.Fatal("expected a changed item")
	}
	if !hasFieldDiff(changed.FieldDiffs, "probability", "modified") {
		t.Fatal("expected probability diff in changed risk")
	}
	if !hasFieldDiff(changed.FieldDiffs, "description", "modified") {
		t.Fatal("expected description diff in changed risk")
	}
	if len(changed.MitigationDiffs) != 1 {
		t.Fatalf("expected 1 mitigation diff, got %d", len(changed.MitigationDiffs))
	}
	if changed.MitigationDiffs[0].ChangeType != "modified" {
		t.Fatalf("expected mitigation diff type modified, got %q", changed.MitigationDiffs[0].ChangeType)
	}
	if !hasFieldDiff(changed.MitigationDiffs[0].FieldDiffs, "action", "modified") {
		t.Fatal("expected mitigation action diff")
	}
	if changed.ChangeReason != "Semester baru" {
		t.Fatalf("expected change reason from target cycle, got %q", changed.ChangeReason)
	}
	if changed.FromSnapshot == nil || changed.ToSnapshot == nil {
		t.Fatal("expected side-by-side snapshots to be populated")
	}
	if changed.FromSnapshot.Description != "Versi awal" {
		t.Fatalf("expected from snapshot description, got %q", changed.FromSnapshot.Description)
	}
	if changed.ToSnapshot.Description != "Versi revisi" {
		t.Fatalf("expected to snapshot description, got %q", changed.ToSnapshot.Description)
	}
	if changed.FromSnapshot.Probability != 3 || changed.ToSnapshot.Probability != 4 {
		t.Fatalf("expected probability snapshots 3->4, got %d->%d", changed.FromSnapshot.Probability, changed.ToSnapshot.Probability)
	}
	if len(changed.FromSnapshot.Mitigations) != 1 || len(changed.ToSnapshot.Mitigations) != 1 {
		t.Fatalf("expected mitigation summaries in snapshots, got %d and %d", len(changed.FromSnapshot.Mitigations), len(changed.ToSnapshot.Mitigations))
	}
	if !strings.Contains(changed.FromSnapshot.Mitigations[0], "Koordinasi vendor A") {
		t.Fatalf("expected from mitigation summary to contain action, got %q", changed.FromSnapshot.Mitigations[0])
	}
	if !strings.Contains(changed.ToSnapshot.Mitigations[0], "Koordinasi vendor A dan B") {
		t.Fatalf("expected to mitigation summary to contain action, got %q", changed.ToSnapshot.Mitigations[0])
	}
	if strings.TrimSpace(report.Summary.FromCycle) != "2025-Q4" || strings.TrimSpace(report.Summary.ToCycle) != "2026-Q2" {
		t.Fatal("expected cycles to be echoed in summary")
	}
}

func TestCompareRiskCycleDetailsUseCase_ExecuteIncludesStableWhenRequested(t *testing.T) {
	repo := &fakeReassessRiskRepo{}
	groupID := uuid.New()
	repo.listCycleSnapshot = func(_ context.Context, _ string, _ []uuid.UUID) ([]*entity.Risk, error) {
		return []*entity.Risk{{
			ID:             uuid.New(),
			VersionGroupID: groupID,
			Code:           "R-010",
			Title:          "Risiko stabil",
			Probability:    3,
			Impact:         3,
			InherentScore:  9,
		}}, nil
	}

	uc := NewCompareRiskCycleDetailsUseCase(repo, nil)
	report, err := uc.Execute(context.Background(), CompareRiskCycleDetailsInput{
		FromCycle:     "2025-Q4",
		ToCycle:       "2026-Q2",
		IncludeStable: true,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(report.Items) != 1 {
		t.Fatalf("expected stable row to be included, got %d items", len(report.Items))
	}
	if report.Items[0].ChangeCategory != "stable" {
		t.Fatalf("expected stable change category, got %q", report.Items[0].ChangeCategory)
	}
	if len(report.Items[0].FieldDiffs) != 0 {
		t.Fatalf("expected no field diffs for stable row, got %d", len(report.Items[0].FieldDiffs))
	}
}

func TestCompareRiskCycleDetailsUseCase_ExecuteRejectsMissingCycles(t *testing.T) {
	uc := NewCompareRiskCycleDetailsUseCase(&fakeReassessRiskRepo{}, nil)
	_, err := uc.Execute(context.Background(), CompareRiskCycleDetailsInput{FromCycle: "", ToCycle: "2026-Q2"})
	if !domainerrors.IsValidation(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestCompareRiskCycleDetailsUseCase_ExecuteMatchesMitigationsBeforeSortOrder(t *testing.T) {
	groupID := uuid.New()
	repo := &fakeReassessRiskRepo{}
	repo.listCycleSnapshot = func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
		base := &entity.Risk{
			ID:             uuid.New(),
			VersionGroupID: groupID,
			Code:           "R-020",
			Title:          "Risiko mitigasi bergeser",
			Probability:    3,
			Impact:         4,
			InherentScore:  12,
		}
		switch cycle {
		case "2025-Q4":
			base.Mitigations = []entity.Mitigation{
				{Action: "Validasi vendor", Owner: "Tim A", Frequency: "rutin", SortOrder: 1},
				{Action: "Monitoring stok", Owner: "Tim B", Frequency: "rutin", SortOrder: 2},
			}
		case "2026-Q2":
			base.Mitigations = []entity.Mitigation{
				{Action: "Briefing mingguan", Owner: "Tim C", Frequency: "rutin", SortOrder: 1},
				{Action: "Validasi vendor", Owner: "Tim A", Frequency: "rutin", SortOrder: 2},
				{Action: "Monitoring stok", Owner: "Tim B", Frequency: "rutin", SortOrder: 3},
			}
		}
		return []*entity.Risk{base}, nil
	}

	uc := NewCompareRiskCycleDetailsUseCase(repo, nil)
	report, err := uc.Execute(context.Background(), CompareRiskCycleDetailsInput{FromCycle: "2025-Q4", ToCycle: "2026-Q2"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(report.Items) != 1 {
		t.Fatalf("expected one changed item, got %d", len(report.Items))
	}
	item := report.Items[0]
	if item.ChangeCategory != "changed" {
		t.Fatalf("expected changed category, got %q", item.ChangeCategory)
	}
	if len(item.MitigationDiffs) != 1 {
		t.Fatalf("expected only one mitigation diff for inserted row, got %d", len(item.MitigationDiffs))
	}
	if item.MitigationDiffs[0].ChangeType != "added" {
		t.Fatalf("expected added mitigation diff, got %q", item.MitigationDiffs[0].ChangeType)
	}
	if item.MitigationDiffs[0].AfterLabel != "Briefing mingguan" {
		t.Fatalf("expected inserted mitigation to be detected, got %q", item.MitigationDiffs[0].AfterLabel)
	}
}

func TestCompareRiskCycleDetailsUseCase_ExecuteIncludesCategoryDiff(t *testing.T) {
	groupID := uuid.New()
	repo := &fakeReassessRiskRepo{}
	repo.listCycleSnapshot = func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
		base := &entity.Risk{
			ID:             uuid.New(),
			VersionGroupID: groupID,
			Code:           "R-030",
			Title:          "Risiko perubahan kategori",
			Probability:    3,
			Impact:         3,
			InherentScore:  9,
		}
		switch cycle {
		case "2025-Q4":
			base.Category = entity.RiskCategoryKebijakan
		case "2026-Q2":
			base.Category = entity.RiskCategoryOperasional
		}
		return []*entity.Risk{base}, nil
	}

	uc := NewCompareRiskCycleDetailsUseCase(repo, nil)
	report, err := uc.Execute(context.Background(), CompareRiskCycleDetailsInput{FromCycle: "2025-Q4", ToCycle: "2026-Q2"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(report.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(report.Items))
	}
	item := report.Items[0]
	if !hasFieldDiff(item.FieldDiffs, "category", "modified") {
		t.Fatal("expected category field diff")
	}
	if item.FromSnapshot == nil || item.ToSnapshot == nil {
		t.Fatal("expected snapshots to be present")
	}
	if item.FromSnapshot.Category != entity.RiskCategoryKebijakan {
		t.Fatalf("expected from snapshot category %q, got %q", entity.RiskCategoryKebijakan, item.FromSnapshot.Category)
	}
	if item.ToSnapshot.Category != entity.RiskCategoryOperasional {
		t.Fatalf("expected to snapshot category %q, got %q", entity.RiskCategoryOperasional, item.ToSnapshot.Category)
	}
}

func TestCompareRiskCycleDetailsUseCase_ExecuteHandlesLegacyBlankCategory(t *testing.T) {
	groupID := uuid.New()
	repo := &fakeReassessRiskRepo{}
	repo.listCycleSnapshot = func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
		base := &entity.Risk{
			ID:             uuid.New(),
			VersionGroupID: groupID,
			Code:           "R-031",
			Title:          "Risiko kategori legacy",
			Probability:    3,
			Impact:         3,
			InherentScore:  9,
			Category:       "",
		}
		if cycle == "2026-Q2" {
			base.Category = "   "
		}
		return []*entity.Risk{base}, nil
	}

	uc := NewCompareRiskCycleDetailsUseCase(repo, nil)
	report, err := uc.Execute(context.Background(), CompareRiskCycleDetailsInput{FromCycle: "2025-Q4", ToCycle: "2026-Q2"})
	if err != nil {
		t.Fatalf("expected no error for blank legacy category, got %v", err)
	}
	if len(report.Items) != 0 {
		t.Fatalf("expected stable blank categories to produce no visible items, got %d", len(report.Items))
	}
	if report.Summary == nil {
		t.Fatal("expected report summary")
	}
	if report.Summary.StableCount != 1 {
		t.Fatalf("expected stable count 1 for blank categories, got %d", report.Summary.StableCount)
	}
}

func TestCompareRiskCycleDetailsUseCase_ExecuteKeepsHistoricalSnapshotsWhenReviewedFieldsDiffer(t *testing.T) {
	groupID := uuid.New()
	repo := &fakeReassessRiskRepo{}
	repo.listCycleSnapshot = func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
		switch cycle {
		case "2025-Q4":
			return []*entity.Risk{{
				ID:                uuid.New(),
				VersionGroupID:    groupID,
				Code:              "R-040",
				Title:             "Risiko skor historis",
				Status:            entity.RiskStatusApproved,
				Probability:       2,
				Impact:            3,
				InherentScore:     6,
				TargetProbability: 1,
				TargetImpact:      2,
				TargetScore:       2,
			}}, nil
		case "2026-Q2":
			return []*entity.Risk{{
				ID:                uuid.New(),
				VersionGroupID:    groupID,
				Code:              "R-040",
				Title:             "Risiko skor historis",
				Status:            entity.RiskStatusApproved,
				Probability:       4,
				Impact:            2,
				InherentScore:     8,
				TargetProbability: 2,
				TargetImpact:      2,
				TargetScore:       4,
			}}, nil
		default:
			return nil, nil
		}
	}

	uc := NewCompareRiskCycleDetailsUseCase(repo, nil)
	report, err := uc.Execute(context.Background(), CompareRiskCycleDetailsInput{FromCycle: "2025-Q4", ToCycle: "2026-Q2"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(report.Items) != 1 {
		t.Fatalf("expected 1 changed item, got %d", len(report.Items))
	}

	item := report.Items[0]
	if item.ChangeCategory != "changed" {
		t.Fatalf("ChangeCategory = %q, want changed", item.ChangeCategory)
	}
	if item.FromSnapshot == nil || item.ToSnapshot == nil {
		t.Fatal("expected side-by-side snapshots")
	}
	if item.FromSnapshot.Probability != 2 || item.ToSnapshot.Probability != 4 {
		t.Fatalf("snapshot probability = %d->%d, want stored historical values 2->4", item.FromSnapshot.Probability, item.ToSnapshot.Probability)
	}
	if item.FromSnapshot.Impact != 3 || item.ToSnapshot.Impact != 2 {
		t.Fatalf("snapshot impact = %d->%d, want stored historical values 3->2", item.FromSnapshot.Impact, item.ToSnapshot.Impact)
	}
	if item.FromSnapshot.InherentScore != 6 || item.ToSnapshot.InherentScore != 8 {
		t.Fatalf("snapshot inherent score = %d->%d, want stored historical values 6->8", item.FromSnapshot.InherentScore, item.ToSnapshot.InherentScore)
	}
	if item.FromSnapshot.TargetScore != 2 || item.ToSnapshot.TargetScore != 4 {
		t.Fatalf("snapshot target score = %d->%d, want stored target values 2->4", item.FromSnapshot.TargetScore, item.ToSnapshot.TargetScore)
	}
	if !hasFieldDiff(item.FieldDiffs, "probability", "modified") {
		t.Fatal("expected probability diff from stored historical values")
	}
	if !hasFieldDiff(item.FieldDiffs, "inherentScore", "modified") {
		t.Fatal("expected inherentScore diff from stored historical values")
	}
	if !hasFieldDiff(item.FieldDiffs, "targetScore", "modified") {
		t.Fatal("expected targetScore diff from stored target values")
	}
}

func hasFieldDiff(diffs []*entity.RiskFieldDiff, field string, changeType string) bool {
	for _, diff := range diffs {
		if diff.Field == field && diff.ChangeType == changeType {
			return true
		}
	}
	return false
}
