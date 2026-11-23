package workingpaper

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestCancelRequiresCreatorAndCurrentOrganizationAccess(t *testing.T) {
	creatorID, orgID := uuid.New(), uuid.New()
	paper := &entity.WorkingPaper{
		ID: uuid.New(), CreatedBy: creatorID, OrgID: orgID,
		Status: entity.WorkingPaperStatusSigning,
	}
	repo := &stubSignWorkingPaperRepo{wp: paper}
	uc := NewWorkingPaperUseCase(repo, nil, nil)
	for _, scope := range []*entity.AccessScope{
		nil,
		{UserID: uuid.New(), IsGlobal: true},
		{UserID: creatorID, AccessibleOrgIDs: []uuid.UUID{uuid.New()}},
	} {
		if err := uc.Cancel(context.Background(), paper.ID, scope); !domainerrors.IsForbidden(err) {
			t.Fatalf("expected cancellation to be forbidden, got %v", err)
		}
	}
	if repo.updated != nil || paper.Status != entity.WorkingPaperStatusSigning {
		t.Fatal("unauthorized cancellation changed the paper")
	}

	scope := &entity.AccessScope{UserID: creatorID, AccessibleOrgIDs: []uuid.UUID{orgID}}
	if err := uc.Cancel(context.Background(), paper.ID, scope); err != nil {
		t.Fatal(err)
	}
	if repo.updated == nil || paper.Status != entity.WorkingPaperStatusCancelled || paper.CancelledAt == nil {
		t.Fatal("expected authorized cancellation to persist a cancelled paper")
	}
	firstCancellation := *paper.CancelledAt
	var appErr *domainerrors.AppError
	if err := uc.Cancel(context.Background(), paper.ID, scope); !errors.As(err, &appErr) || appErr.Code != "INVALID_STATUS" {
		t.Fatalf("expected a rejected second cancellation, got %v", err)
	}
	if !paper.CancelledAt.Equal(firstCancellation) {
		t.Fatal("a second cancellation rewrote the cancellation timestamp")
	}
}
