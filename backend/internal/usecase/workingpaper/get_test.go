package workingpaper

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type stubGetWorkingPaperRepo struct {
	wp *entity.WorkingPaper
}

func (r *stubGetWorkingPaperRepo) Create(context.Context, *entity.WorkingPaper) error {
	return nil
}

func (r *stubGetWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return r.wp, nil
}

func (r *stubGetWorkingPaperRepo) List(context.Context, []uuid.UUID, string, string, string, int, int) ([]*entity.WorkingPaper, int, error) {
	return nil, 0, nil
}

func (r *stubGetWorkingPaperRepo) Update(context.Context, *entity.WorkingPaper) error {
	return nil
}

func (r *stubGetWorkingPaperRepo) Delete(context.Context, uuid.UUID) error {
	return nil
}

func (r *stubGetWorkingPaperRepo) GetByIDForUpdate(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}

func (r *stubGetWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return nil, nil
}

func (r *stubGetWorkingPaperRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error {
	return nil
}

func (r *stubGetWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) {
	return nil, nil
}

func (r *stubGetWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) {
	return 0, nil
}

func (r *stubGetWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) {
	return false, nil
}

func (r *stubGetWorkingPaperRepo) MutateByIDForUpdate(context.Context, uuid.UUID, func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	return nil, nil
}

func TestGetReturnsLinkedRisksInsteadOfSnapshots(t *testing.T) {
	orgID := uuid.New()
	wpID := uuid.New()
	riskID := uuid.New()

	uc := NewWorkingPaperUseCase(&stubGetWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:              wpID,
		OrgID:           orgID,
		Title:           "KK Semester I",
		Status:          entity.WorkingPaperStatusDraft,
		AssessmentCycle: "2026-H1",
		Risks: []entity.WorkingPaperRiskLink{{
			ID:             uuid.New(),
			WorkingPaperID: wpID,
			RiskID:         riskID,
			SortOrder:      0,
			SourceMode:     "latest_approved",
			Risk: entity.WorkingPaperRiskData{
				ID:              riskID,
				Code:            "R-001",
				Title:           "Gangguan server utama",
				Probability:     4,
				Impact:          5,
				Nilai:           20,
				TingkatRisiko:   entity.RiskLevelSangatTinggi,
				AssessmentCycle: "2026-H1",
			},
			CreatedAt: time.Now(),
		}},
	}}, nil)

	got, err := uc.Get(context.Background(), wpID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}
	if len(got.Risks) != 1 {
		t.Fatalf("expected 1 linked risk, got %d", len(got.Risks))
	}
	if got.Risks[0].Risk.Code != "R-001" {
		t.Fatalf("expected linked risk code R-001, got %q", got.Risks[0].Risk.Code)
	}
}

func TestWorkingPaperRiskDataNormalizeDerivedScoresRecomputesPriority(t *testing.T) {
	risk := entity.WorkingPaperRiskData{
		Probability:     4,
		Impact:          5,
		Nilai:           20,
		PrioritasRisiko: 5,
	}

	risk.NormalizeDerivedScores()

	if risk.TingkatRisiko != entity.RiskLevelSangatTinggi {
		t.Fatalf("expected tingkat risiko %q, got %q", entity.RiskLevelSangatTinggi, risk.TingkatRisiko)
	}
	if risk.PrioritasRisiko != 1 {
		t.Fatalf("expected finalized priority 1, got %d", risk.PrioritasRisiko)
	}
}

type atomicSignWorkingPaperRepo struct {
	wp             *entity.WorkingPaper
	mutateCalls    int
	nonAtomicCalls int
	updated        *entity.WorkingPaper
}

func (r *atomicSignWorkingPaperRepo) Create(context.Context, *entity.WorkingPaper) error {
	return nil
}

func (r *atomicSignWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}

func (r *atomicSignWorkingPaperRepo) List(context.Context, []uuid.UUID, string, string, string, int, int) ([]*entity.WorkingPaper, int, error) {
	return nil, 0, nil
}

func (r *atomicSignWorkingPaperRepo) Update(context.Context, *entity.WorkingPaper) error {
	r.nonAtomicCalls++
	return errors.New("non-atomic update path should not be used")
}

func (r *atomicSignWorkingPaperRepo) Delete(context.Context, uuid.UUID) error {
	return nil
}

func (r *atomicSignWorkingPaperRepo) GetByIDForUpdate(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	r.nonAtomicCalls++
	return nil, errors.New("non-atomic lock path should not be used")
}

func (r *atomicSignWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return nil, nil
}

func (r *atomicSignWorkingPaperRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error {
	r.nonAtomicCalls++
	return errors.New("non-atomic signatory update path should not be used")
}

func (r *atomicSignWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) {
	return nil, nil
}

func (r *atomicSignWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) {
	return 0, nil
}

func (r *atomicSignWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) {
	return false, nil
}

func (r *atomicSignWorkingPaperRepo) MutateByIDForUpdate(_ context.Context, _ uuid.UUID, mutate func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	r.mutateCalls++
	if err := mutate(r.wp); err != nil {
		return nil, err
	}
	r.updated = r.wp
	return r.wp, nil
}

func TestSignUsesAtomicMutationPath(t *testing.T) {
	workingPaperID := uuid.New()
	signerID := uuid.New()
	signatoryID := uuid.New()
	repo := &atomicSignWorkingPaperRepo{wp: &entity.WorkingPaper{
		ID:           workingPaperID,
		Title:        "KK Semester I",
		DocumentHash: "hash-123",
		Status:       entity.WorkingPaperStatusDraft,
		Signatories: []entity.WorkingPaperSignatory{{
			ID:             signatoryID,
			WorkingPaperID: workingPaperID,
			UserID:         signerID,
			SequenceNo:     1,
			SignerName:     "Signer One",
			SignerNIP:      "19800101",
			SignerPangkat:  "Pembina Tk. I (IV/b)",
			Status:         "pending",
		}},
	}}

	uc := NewWorkingPaperUseCase(repo, nil)

	got, err := uc.Sign(context.Background(), workingPaperID, signerID)
	if err != nil {
		t.Fatalf("Sign returned error: %v", err)
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
	if got.Signatories[0].Status != "signed" {
		t.Fatalf("expected signatory to be signed, got %q", got.Signatories[0].Status)
	}
	if got.Signatories[0].SignedAt == nil {
		t.Fatal("expected signatory signed_at to be set")
	}
	if got.Signatories[0].QRCodePNG == "" {
		t.Fatal("expected QR code png to be populated")
	}
	if len(got.Signatories[0].QRData) == 0 {
		t.Fatal("expected QR data to be populated")
	}

	var payload map[string]any
	if err := json.Unmarshal(got.Signatories[0].QRData, &payload); err != nil {
		t.Fatalf("expected valid QR data JSON: %v", err)
	}
}
