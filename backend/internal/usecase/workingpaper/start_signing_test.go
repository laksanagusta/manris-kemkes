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

	got, err := uc.StartSigning(context.Background(), wpID, creatorID)
	if err != nil {
		t.Fatalf("StartSigning returned error: %v", err)
	}
	if got.Status != entity.WorkingPaperStatusSigning {
		t.Fatalf("expected signing status, got %s", got.Status)
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

	_, err := uc.StartSigning(context.Background(), wpID, uuid.New())
	if err == nil {
		t.Fatal("expected error")
	}
	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != "FORBIDDEN" {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}
