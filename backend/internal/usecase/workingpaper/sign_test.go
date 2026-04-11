package workingpaper

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type stubSignWorkingPaperRepo struct {
	wp      *entity.WorkingPaper
	updated *entity.WorkingPaper
}

func (r *stubSignWorkingPaperRepo) Create(context.Context, *entity.WorkingPaper) error { return nil }
func (r *stubSignWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *stubSignWorkingPaperRepo) List(context.Context, []uuid.UUID, string, int, int) ([]*entity.WorkingPaper, int, error) {
	return nil, 0, nil
}
func (r *stubSignWorkingPaperRepo) Update(context.Context, *entity.WorkingPaper) error { return nil }
func (r *stubSignWorkingPaperRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *stubSignWorkingPaperRepo) MutateByIDForUpdate(_ context.Context, _ uuid.UUID, mutate func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	if err := mutate(r.wp); err != nil {
		return nil, err
	}
	r.updated = r.wp
	return r.wp, nil
}
func (r *stubSignWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return nil, nil
}
func (r *stubSignWorkingPaperRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error {
	return nil
}
func (r *stubSignWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *stubSignWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) {
	return 0, nil
}
func (r *stubSignWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) {
	return false, nil
}

func TestSignComputesDocumentHashFromLinkedRisksBeforeFirstSignature(t *testing.T) {
	signerID := uuid.New()
	sigID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		Title:           "KK Semester I",
		Status:          entity.WorkingPaperStatusDraft,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{{
			RiskID:    uuid.New(),
			Risk:      entity.WorkingPaperRiskData{Code: "R-001", Title: "Gangguan server", Probability: 4, Impact: 5, Nilai: 20, TingkatRisiko: entity.RiskLevelSangatTinggi, AssessmentCycle: "2026-H1"},
			CreatedAt: time.Now(),
		}},
		Signatories: []entity.WorkingPaperSignatory{{ID: sigID, UserID: signerID, SequenceNo: 1, SignerName: "Rina", SignerTitle: "Kabid", SignerRoleLabel: "Pemeriksa", Status: "pending"}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil)
	got, err := uc.Sign(context.Background(), wpID, signerID)
	if err != nil {
		t.Fatalf("Sign returned error: %v", err)
	}
	if got.DocumentHash == "" {
		t.Fatal("expected document hash to be computed before signing")
	}
	if repo.updated == nil || repo.updated.DocumentHash == "" {
		t.Fatal("expected updated working paper to persist document hash")
	}
}
