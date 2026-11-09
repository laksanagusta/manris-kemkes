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

func TestStartSigningMovesDraftWorkingPaperToSigning(t *testing.T) {
	creatorID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		CreatedBy:       creatorID,
		Status:          entity.WorkingPaperStatusDraft,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{{
			RiskID: uuid.New(),
			Risk: entity.WorkingPaperRiskData{
				ID:         uuid.New(),
				Code:       "R-001",
				Title:      "Risk one",
				Status:     entity.RiskStatusApproved,
				Monitoring: &entity.WorkingPaperRiskMonitoring{Status: entity.RiskMonitoringStatusFinalized},
			},
			CreatedAt: time.Now(),
		}},
		Signatories: []entity.WorkingPaperSignatory{{
			ID:            uuid.New(),
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
			Status:        "pending",
		}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil, nil)

	reviewHash, err := repo.wp.SigningReviewHash()
	if err != nil {
		t.Fatal(err)
	}
	repo.wp.Risks[0].Risk.Monitoring.ObservedProbability = 3
	_, err = uc.StartSigning(context.Background(), wpID, creatorID, reviewHash)
	var conflict *domainerrors.AppError
	if !errors.As(err, &conflict) || conflict.Code != "WORKING_PAPER_REVIEW_CHANGED" || repo.updated != nil {
		t.Fatalf("expected stale review to leave the draft untouched, got %v", err)
	}
	reviewHash, err = repo.wp.SigningReviewHash()
	if err != nil {
		t.Fatal(err)
	}
	got, err := uc.StartSigning(context.Background(), wpID, creatorID, reviewHash)
	if err != nil {
		t.Fatalf("StartSigning returned error: %v", err)
	}
	if got.Status != entity.WorkingPaperStatusSigning {
		t.Fatalf("expected signing status, got %s", got.Status)
	}
	if !got.ContentLocked || got.DocumentHash != reviewHash || len(got.SigningSnapshot) == 0 {
		t.Fatal("expected the reviewed content and hash to be locked")
	}
	if repo.updated == nil || repo.updated.Status != entity.WorkingPaperStatusSigning {
		t.Fatal("expected working paper update to persist signing status")
	}
}

func TestStartSigningRejectsNonCreator(t *testing.T) {
	creatorID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:        wpID,
		CreatedBy: creatorID,
		Status:    entity.WorkingPaperStatusDraft,
		Risks: []entity.WorkingPaperRiskLink{{
			RiskID: uuid.New(),
			Risk: entity.WorkingPaperRiskData{
				ID:         uuid.New(),
				Code:       "R-001",
				Title:      "Risk one",
				Status:     entity.RiskStatusApproved,
				Monitoring: &entity.WorkingPaperRiskMonitoring{Status: entity.RiskMonitoringStatusFinalized},
			},
		}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil, nil)

	_, err := uc.StartSigning(context.Background(), wpID, uuid.New(), "")
	if err == nil {
		t.Fatal("expected error")
	}
	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != "FORBIDDEN" {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}
