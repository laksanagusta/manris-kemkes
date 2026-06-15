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

type stubSignWorkingPaperRepo struct {
	wp      *entity.WorkingPaper
	updated *entity.WorkingPaper
}

func (r *stubSignWorkingPaperRepo) Create(context.Context, *entity.WorkingPaper) error { return nil }
func (r *stubSignWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *stubSignWorkingPaperRepo) List(context.Context, []uuid.UUID, string, string, string, string, int, int) ([]*entity.WorkingPaper, int, error) {
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

func (r *stubSignWorkingPaperRepo) CountByOrgAndCycle(context.Context, uuid.UUID, string) (int, error) {
	return 0, nil
}

func TestSignComputesDocumentHashFromLinkedRisksBeforeFirstSignature(t *testing.T) {
	signerID := uuid.New()
	sigID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		Title:           "KK Semester I",
		Status:          entity.WorkingPaperStatusSigning,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{{
			RiskID:    uuid.New(),
			Risk:      entity.WorkingPaperRiskData{Code: "R-001", Title: "Gangguan server", Probability: 4, Impact: 5, Nilai: 20, TingkatRisiko: entity.RiskLevelSangatTinggi, AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved},
			CreatedAt: time.Now(),
		}},
		Signatories: []entity.WorkingPaperSignatory{{ID: sigID, UserID: signerID, SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)", Status: "pending"}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil, nil)
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

func TestSignRejectsDraftWorkingPaperBeforeSigningStarted(t *testing.T) {
	signerID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		Title:           "KK Semester I",
		Status:          entity.WorkingPaperStatusDraft,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{{
			RiskID:    uuid.New(),
			Risk:      entity.WorkingPaperRiskData{Code: "R-001", Title: "Risk one", Probability: 4, Impact: 5, Nilai: 20, TingkatRisiko: entity.RiskLevelSangatTinggi, AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved},
			CreatedAt: time.Now(),
		}},
		Signatories: []entity.WorkingPaperSignatory{{ID: uuid.New(), UserID: signerID, SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)", Status: "pending"}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil, nil)
	_, err := uc.Sign(context.Background(), wpID, signerID)
	if err == nil {
		t.Fatal("expected error for draft working paper")
	}
	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != "INVALID_STATUS" {
		t.Fatalf("expected invalid status error, got %v", err)
	}
}

func TestSignRejectsWhenLinkedRiskNotApproved(t *testing.T) {
	signerID := uuid.New()
	sigID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		Title:           "KK Semester I",
		Status:          entity.WorkingPaperStatusSigning,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{
			{
				RiskID:    uuid.New(),
				Risk:      entity.WorkingPaperRiskData{Code: "R-001", Title: "Risk approved", Probability: 3, Impact: 4, Nilai: 12, TingkatRisiko: entity.RiskLevelTinggi, AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved},
				CreatedAt: time.Now(),
			},
			{
				RiskID:    uuid.New(),
				Risk:      entity.WorkingPaperRiskData{Code: "R-002", Title: "Risk draft", Probability: 2, Impact: 3, Nilai: 6, TingkatRisiko: entity.RiskLevelSedang, AssessmentCycle: "2026-H1", Status: entity.RiskStatusDraft},
				CreatedAt: time.Now(),
			},
		},
		Signatories: []entity.WorkingPaperSignatory{{ID: sigID, UserID: signerID, SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)", Status: "pending"}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil, nil)
	_, err := uc.Sign(context.Background(), wpID, signerID)
	if err == nil {
		t.Fatal("expected error when linked risk is not approved, got nil")
	}

	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected AppError, got %T: %v", err, err)
	}
	if appErr.Code != "RISKS_NOT_APPROVED" {
		t.Fatalf("expected code RISKS_NOT_APPROVED, got %s", appErr.Code)
	}
}

func TestSignSucceedsWhenAllLinkedRisksApproved(t *testing.T) {
	signerID := uuid.New()
	sigID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		Title:           "KK Semester I",
		Status:          entity.WorkingPaperStatusSigning,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{
			{
				RiskID:    uuid.New(),
				Risk:      entity.WorkingPaperRiskData{Code: "R-001", Title: "Risk one", Probability: 4, Impact: 5, Nilai: 20, TingkatRisiko: entity.RiskLevelSangatTinggi, AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved},
				CreatedAt: time.Now(),
			},
			{
				RiskID:    uuid.New(),
				Risk:      entity.WorkingPaperRiskData{Code: "R-002", Title: "Risk two", Probability: 3, Impact: 3, Nilai: 9, TingkatRisiko: entity.RiskLevelSedang, AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved},
				CreatedAt: time.Now(),
			},
		},
		Signatories: []entity.WorkingPaperSignatory{{ID: sigID, UserID: signerID, SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)", Status: "pending"}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil, nil)
	got, err := uc.Sign(context.Background(), wpID, signerID)
	if err != nil {
		t.Fatalf("Sign returned error: %v", err)
	}
	if got.DocumentHash == "" {
		t.Fatal("expected document hash to be computed")
	}
}

func TestSignBlocksWhenMonitoringDraftRemains(t *testing.T) {
	signerID := uuid.New()
	sigID := uuid.New()
	wpID := uuid.New()
	repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		Title:           "KK Semester I",
		Status:          entity.WorkingPaperStatusSigning,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{
			{
				RiskID:    uuid.New(),
				Risk:      entity.WorkingPaperRiskData{Code: "R-001", Title: "Risk one", Probability: 4, Impact: 5, Nilai: 20, TingkatRisiko: entity.RiskLevelSangatTinggi, AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved, Monitoring: &entity.WorkingPaperRiskMonitoring{Status: entity.RiskMonitoringStatusFinalized}},
				CreatedAt: time.Now(),
			},
			{
				RiskID:    uuid.New(),
				Risk:      entity.WorkingPaperRiskData{Code: "R-002", Title: "Risk two", Probability: 3, Impact: 3, Nilai: 9, TingkatRisiko: entity.RiskLevelSedang, AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved, Monitoring: &entity.WorkingPaperRiskMonitoring{Status: entity.RiskMonitoringStatusDraft}},
				CreatedAt: time.Now(),
			},
		},
		Signatories: []entity.WorkingPaperSignatory{{ID: sigID, UserID: signerID, SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)", Status: "pending"}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil, nil)
	_, err := uc.Sign(context.Background(), wpID, signerID)
	if err == nil {
		t.Fatal("expected monitoring blocker error")
	}

	var appErr *domainerrors.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected AppError, got %T: %v", err, err)
	}
	if appErr.Code != "MONITORING_INCOMPLETE" {
		t.Fatalf("expected code MONITORING_INCOMPLETE, got %s", appErr.Code)
	}
	if repo.updated != nil {
		t.Fatal("expected working paper not to be updated when monitoring blocks signing")
	}
}
