package workingpaper

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestSkipTTEFinalizesDraftWorkingPaperForCreator(t *testing.T) {
	workingPaperID := uuid.New()
	creatorID := uuid.New()
	riskID := uuid.New()
	repo := &atomicSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:        workingPaperID,
		CreatedBy: creatorID,
		Status:    entity.WorkingPaperStatusDraft,
		Risks: []entity.WorkingPaperRiskLink{{
			ID:             uuid.New(),
			WorkingPaperID: workingPaperID,
			RiskID:         riskID,
			SortOrder:      0,
			SourceMode:     "latest_approved",
			Risk: entity.WorkingPaperRiskData{
				ID:     riskID,
				Status: entity.RiskStatusApproved,
			},
		}},
		Signatories: []entity.WorkingPaperSignatory{{
			ID:             uuid.New(),
			WorkingPaperID: workingPaperID,
			UserID:         uuid.New(),
			SequenceNo:     1,
			SignerName:     "Signer One",
			Status:         "pending",
		}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil)

	got, err := uc.SkipTTE(context.Background(), workingPaperID, creatorID)
	if err != nil {
		t.Fatalf("SkipTTE returned error: %v", err)
	}
	if repo.mutateCalls != 1 {
		t.Fatalf("expected atomic mutation path once, got %d", repo.mutateCalls)
	}
	if repo.nonAtomicCalls != 0 {
		t.Fatalf("expected non-atomic path to stay unused, got %d calls", repo.nonAtomicCalls)
	}
	if got.Status != entity.WorkingPaperStatusCompleted {
		t.Fatalf("expected working paper status %q, got %q", entity.WorkingPaperStatusCompleted, got.Status)
	}
	if !got.TTESkipped {
		t.Fatal("expected TTE to be marked as skipped")
	}
	if got.CompletedAt == nil {
		t.Fatal("expected completed_at to be set")
	}
	if got.UpdatedAt.IsZero() {
		t.Fatal("expected updated_at to be set")
	}
}

func TestSkipTTERejectsNonCreator(t *testing.T) {
	workingPaperID := uuid.New()
	creatorID := uuid.New()
	repo := &atomicSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:        workingPaperID,
		CreatedBy: creatorID,
		Status:    entity.WorkingPaperStatusDraft,
		Risks: []entity.WorkingPaperRiskLink{{
			ID: uuid.New(),
			Risk: entity.WorkingPaperRiskData{
				ID:     uuid.New(),
				Status: entity.RiskStatusApproved,
			},
		}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil)

	_, err := uc.SkipTTE(context.Background(), workingPaperID, uuid.New())
	if err == nil {
		t.Fatal("expected error")
	}
	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != "FORBIDDEN" {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}

func TestSkipTTERejectsUnapprovedRisks(t *testing.T) {
	workingPaperID := uuid.New()
	creatorID := uuid.New()
	repo := &atomicSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:        workingPaperID,
		CreatedBy: creatorID,
		Status:    entity.WorkingPaperStatusDraft,
		Risks: []entity.WorkingPaperRiskLink{{
			ID: uuid.New(),
			Risk: entity.WorkingPaperRiskData{
				ID:     uuid.New(),
				Status: entity.RiskStatusDraft,
			},
		}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil)

	_, err := uc.SkipTTE(context.Background(), workingPaperID, creatorID)
	if err == nil {
		t.Fatal("expected error")
	}
	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != "RISKS_NOT_APPROVED" {
		t.Fatalf("expected risks not approved error, got %v", err)
	}
}

func TestSkipTTERequiresDraftStatus(t *testing.T) {
	workingPaperID := uuid.New()
	creatorID := uuid.New()
	completedAt := time.Now()
	repo := &atomicSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:          workingPaperID,
		CreatedBy:   creatorID,
		Status:      entity.WorkingPaperStatusCompleted,
		CompletedAt: &completedAt,
		Risks: []entity.WorkingPaperRiskLink{{
			ID: uuid.New(),
			Risk: entity.WorkingPaperRiskData{
				ID:     uuid.New(),
				Status: entity.RiskStatusApproved,
			},
		}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil)

	_, err := uc.SkipTTE(context.Background(), workingPaperID, creatorID)
	if err == nil {
		t.Fatal("expected error")
	}
	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != "INVALID_STATUS" {
		t.Fatalf("expected invalid status error, got %v", err)
	}
}
