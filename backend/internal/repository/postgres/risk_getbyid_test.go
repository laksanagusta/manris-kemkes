package postgres_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
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

func TestRiskOwnerAndCombinedSourceRoundTrip(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewRiskRepository(pool)
	ctx := context.Background()
	orgID := insertTestOrganization(t, pool, "Risk owner test unit")
	ownerID := uuid.New()
	const ownerName = "Pemilik Risiko Pengujian"
	if _, err := pool.Exec(ctx, `INSERT INTO users (id, name, username, email, password_hash, role, organization_id)
		VALUES ($1, $2, $3, $4, 'test-hash', 'unit', $5)`, ownerID, ownerName,
		ownerID.String(), ownerID.String()+"@example.test", orgID); err != nil {
		t.Fatalf("insert test owner: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(ctx, "DELETE FROM users WHERE id = $1", ownerID) })

	risk := &entity.Risk{
		Code: "R-TEST-OWNER-" + uuid.NewString()[:8], Title: "Risiko distribusi",
		Description: "Distribusi terlambat", Category: entity.RiskCategoryOperasional,
		Status: entity.RiskStatusDraft, VersionGroupID: uuid.New(), VersionNumber: 1,
		IsCurrent: true, IsCycleCurrent: true, OrganizationID: &orgID, RiskOwnerID: &ownerID,
		RiskSource: "internal_eksternal", AssessmentCycle: "2026-Q4", Probability: 3, Impact: 3,
	}
	if err := repo.Create(ctx, risk); err != nil {
		t.Fatalf("create risk: %v", err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, risk.ID) })

	stored, err := repo.GetByID(ctx, risk.ID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("get risk: %v", err)
	}
	if stored.RiskOwnerID == nil || *stored.RiskOwnerID != ownerID || stored.RiskOwnerName != ownerName || stored.RiskSource != "internal_eksternal" {
		t.Fatalf("owner or source not returned by GetByID: %+v", stored)
	}
	users := postgres.NewUserRepository(pool)
	if err := users.Delete(ctx, ownerID); !errors.Is(err, domainerrors.ErrUserOwnsRisks) {
		t.Fatalf("delete assigned risk owner: expected conflict, got %v", err)
	}

	stored.RiskOwnerID = nil
	if err := repo.Update(ctx, stored); err != nil {
		t.Fatalf("update risk: %v", err)
	}
	stored, err = repo.GetByID(ctx, risk.ID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("get updated risk: %v", err)
	}
	if stored.RiskOwnerID != nil || stored.RiskOwnerName != "" || stored.RiskSource != "internal_eksternal" {
		t.Fatalf("unexpected owner or source on updated risk: %+v", stored)
	}
	if err := users.Delete(ctx, ownerID); err != nil {
		t.Fatalf("delete former owner after clearing the assignment: %v", err)
	}
}
