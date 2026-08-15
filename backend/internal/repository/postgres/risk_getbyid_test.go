package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestRiskGetByIDIncludesOngoingReassessmentFields(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewRiskRepository(pool)
	ctx := context.Background()

	versionGroupID := uuid.New()
	source := &entity.Risk{
		Code:                     "R-TEST-ONGOING-" + uuid.NewString()[:8],
		Title:                    "Source approved risk",
		Description:              "Approved risk with ongoing periodic reassessment",
		Category:                 entity.RiskCategoryOperasional,
		Status:                   entity.RiskStatusApproved,
		VersionGroupID:           versionGroupID,
		IsCurrent:                true,
		IsCycleCurrent:           true,
		VersionNumber:            1,
		AssessmentCycle:          "2025-H2",
		Probability:              4,
		Impact:                   4,
		RiskSource:               "internal",
		Controllability:          "C",
		RiskAppetite:             "dalam_batas",
		TreatmentOption:          "mitigasi",
		ReviewScheduleText:       "Semester review",
		ResidualAcceptanceReason: "",
	}

	if err := repo.Create(ctx, source); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() {
		_ = repo.Delete(ctx, source.ID)
	})

	draft := riskuc.BuildPeriodicReassessmentDraft(
		source,
		"2026-H1",
		time.Date(2026, time.January, 15, 8, 0, 0, 0, time.UTC),
		uuid.Nil,
	)
	draft.Status = entity.RiskStatusDraft

	if err := repo.Create(ctx, draft); err != nil {
		t.Fatalf("Create reassessment draft: %v", err)
	}
	t.Cleanup(func() {
		_ = repo.Delete(ctx, draft.ID)
	})

	got, err := repo.GetByID(ctx, source.ID, nil)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}

	if !got.HasOngoing {
		t.Fatal("expected hasOngoing=true for source risk with in-progress reassessment")
	}
	if got.DraftID == nil {
		t.Fatal("expected draftId to be populated")
	}
	if *got.DraftID != draft.ID {
		t.Fatalf("expected draftId %s, got %s", draft.ID, *got.DraftID)
	}
	if got.DraftStatus == nil {
		t.Fatal("expected draftStatus to be populated")
	}
	if *got.DraftStatus != entity.RiskStatusDraft {
		t.Fatalf("expected draftStatus %q, got %q", entity.RiskStatusDraft, *got.DraftStatus)
	}
}
