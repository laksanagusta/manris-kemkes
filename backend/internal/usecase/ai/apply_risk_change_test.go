package ai

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeRiskRepository struct {
	risks       map[uuid.UUID]*entity.Risk
	createCalls []*entity.Risk
	updateCalls []*entity.Risk
}

func (r *fakeRiskRepository) Create(_ context.Context, risk *entity.Risk) error {
	cloned := cloneRiskForTest(risk)
	r.createCalls = append(r.createCalls, cloned)
	r.risks[risk.ID] = cloneRiskForTest(risk)
	return nil
}

func (r *fakeRiskRepository) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	risk, ok := r.risks[id]
	if !ok {
		return nil, domainerrors.ErrRiskNotFound
	}
	return cloneRiskForTest(risk), nil
}

func (r *fakeRiskRepository) Update(_ context.Context, risk *entity.Risk) error {
	cloned := cloneRiskForTest(risk)
	r.updateCalls = append(r.updateCalls, cloned)
	r.risks[risk.ID] = cloneRiskForTest(risk)
	return nil
}

func (r *fakeRiskRepository) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}

func (r *fakeRiskRepository) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeRiskRepository) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, errors.New("not implemented")
}

func (r *fakeRiskRepository) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeRiskRepository) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}

func (r *fakeRiskRepository) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeRiskRepository) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeRiskRepository) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeRiskRepository) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeRiskRepository) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, errors.New("not implemented")
}

func TestApplyTranscriptRiskChangesUpdatesDraftRisk(t *testing.T) {
	riskID := uuid.New()
	versionGroupID := uuid.New()
	repo := &fakeRiskRepository{
		risks: map[uuid.UUID]*entity.Risk{
			riskID: {
				ID:             riskID,
				Code:           "R-001",
				Title:          "Pemalsuan data",
				Description:    "Deskripsi awal",
				Status:         "draft",
				VersionGroupID: versionGroupID,
				IsCurrent:      true,
				Probability:    3,
				Impact:         4,
				Mitigations: []entity.Mitigation{
					{Action: "Validasi manual", Owner: "Tim verifikator", Frequency: "insidental"},
				},
			},
		},
	}

	uc := NewApplyTranscriptRiskChangesUseCase(repo)
	output, err := uc.Execute(context.Background(), ApplyTranscriptRiskChangesInput{
		TargetRiskID: riskID,
		ActorRole:    "unit",
		SelectedChanges: []entity.TranscriptRiskChange{
			{
				ID:        "chg-desc",
				Field:     "description",
				Operation: "set",
				Value:     map[string]any{"text": "Deskripsi diperbarui"},
			},
			{
				ID:        "chg-mitigation",
				Field:     "mitigations",
				Operation: "append",
				Value: map[string]any{
					"action":    "Audit laporan",
					"owner":     "",
					"frequency": "insidental",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if output.CreatedNewVersion {
		t.Fatal("expected draft risk to be updated in place")
	}

	if got := len(repo.updateCalls); got != 1 {
		t.Fatalf("expected 1 update call, got %d", got)
	}

	updated := repo.updateCalls[0]
	if updated.ID != riskID {
		t.Fatalf("expected same risk id, got %s", updated.ID)
	}
	if updated.Description != "Deskripsi diperbarui" {
		t.Fatalf("expected updated description, got %q", updated.Description)
	}
	if got := len(updated.Mitigations); got != 2 {
		t.Fatalf("expected 2 mitigations after merge, got %d", got)
	}
	if got := updated.Mitigations[1].Owner; got != defaultTranscriptMitigationOwner {
		t.Fatalf("expected default mitigation owner %q, got %q", defaultTranscriptMitigationOwner, got)
	}
}

func TestApplyTranscriptRiskChangesCreatesNewVersionForApprovedRisk(t *testing.T) {
	riskID := uuid.New()
	versionGroupID := uuid.New()
	repo := &fakeRiskRepository{
		risks: map[uuid.UUID]*entity.Risk{
			riskID: {
				ID:             riskID,
				Code:           "R-010",
				Title:          "Keracunan pangan",
				Description:    "Deskripsi existing",
				Status:         "approved",
				VersionGroupID: versionGroupID,
				IsCurrent:      true,
				Probability:    3,
				Impact:         5,
				Cause:          []string{"Penyimpanan tidak sesuai"},
				Mitigations: []entity.Mitigation{
					{Action: "Inspeksi dapur", Owner: "Tim mutu", Frequency: "mingguan"},
				},
			},
		},
	}

	uc := NewApplyTranscriptRiskChangesUseCase(repo)
	output, err := uc.Execute(context.Background(), ApplyTranscriptRiskChangesInput{
		TargetRiskID: riskID,
		ActorID:      uuid.New(),
		ActorRole:    "superadmin",
		SelectedChanges: []entity.TranscriptRiskChange{
			{
				ID:        "chg-prob",
				Field:     "probability",
				Operation: "set",
				Value:     4,
			},
		},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !output.CreatedNewVersion {
		t.Fatal("expected approved risk to create a new version")
	}

	if got := len(repo.updateCalls); got != 1 {
		t.Fatalf("expected 1 archive update, got %d", got)
	}
	if got := len(repo.createCalls); got != 1 {
		t.Fatalf("expected 1 create call for new version, got %d", got)
	}

	archived := repo.updateCalls[0]
	if archived.IsCurrent {
		t.Fatal("expected archived risk to no longer be current")
	}
	if archived.ArchivedReason != "superseded_by_transcript_apply" {
		t.Fatalf("expected archived reason to be set, got %q", archived.ArchivedReason)
	}

	created := repo.createCalls[0]
	if created.ID == riskID {
		t.Fatal("expected a new risk id for the created version")
	}
	if created.Code != "R-010" {
		t.Fatalf("expected risk code to stay the same, got %q", created.Code)
	}
	if created.VersionGroupID != versionGroupID {
		t.Fatalf("expected version group to stay the same, got %s", created.VersionGroupID)
	}
	if created.PreviousRiskID == nil || *created.PreviousRiskID != riskID {
		t.Fatalf("expected previous risk id to point to archived version, got %v", created.PreviousRiskID)
	}
	if created.Status != "draft" {
		t.Fatalf("expected new version status draft, got %q", created.Status)
	}
	if created.Probability != 4 {
		t.Fatalf("expected applied probability change, got %d", created.Probability)
	}
}

func TestApplyTranscriptRiskChangesKeepsExistingValuesWhenSuggestedValuesAreEmpty(t *testing.T) {
	riskID := uuid.New()
	versionGroupID := uuid.New()
	repo := &fakeRiskRepository{
		risks: map[uuid.UUID]*entity.Risk{
			riskID: {
				ID:              riskID,
				Code:            "R-020",
				Title:           "Pemalsuan dokumen kesehatan",
				Description:     "Deskripsi lama yang tetap dipakai",
				Status:          "approved",
				VersionGroupID:  versionGroupID,
				IsCurrent:       true,
				Probability:     4,
				Impact:          4,
				ExistingControl: "Validasi manual oleh petugas",
				TreatmentOption: "mitigate",
				Cause:           []string{"Verifikasi lapangan belum konsisten"},
				ImpactDesc:      []string{"Layanan tidak tepat sasaran"},
			},
		},
	}

	uc := NewApplyTranscriptRiskChangesUseCase(repo)
	output, err := uc.Execute(context.Background(), ApplyTranscriptRiskChangesInput{
		TargetRiskID: riskID,
		ActorID:      uuid.New(),
		ActorRole:    "unit",
		SelectedChanges: []entity.TranscriptRiskChange{
			{ID: "chg-desc", Field: "description", Operation: "set", Value: map[string]any{"text": ""}},
			{ID: "chg-control", Field: "existingControl", Operation: "set", Value: ""},
			{ID: "chg-treatment", Field: "treatmentOption", Operation: "set", Value: map[string]any{"value": ""}},
			{ID: "chg-probability", Field: "probability", Operation: "set", Value: 0},
			{ID: "chg-impact", Field: "impact", Operation: "set", Value: 0},
			{ID: "chg-cause", Field: "cause", Operation: "append", Value: []any{""}},
			{ID: "chg-impact-desc", Field: "impactDesc", Operation: "append", Value: []any{""}},
		},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !output.CreatedNewVersion {
		t.Fatal("expected approved risk to still create a new version")
	}

	if got := len(repo.createCalls); got != 1 {
		t.Fatalf("expected 1 created version, got %d", got)
	}

	created := repo.createCalls[0]
	if created.Description != "Deskripsi lama yang tetap dipakai" {
		t.Fatalf("expected description fallback from old risk, got %q", created.Description)
	}
	if created.ExistingControl != "Validasi manual oleh petugas" {
		t.Fatalf("expected existing control fallback, got %q", created.ExistingControl)
	}
	if created.TreatmentOption != "mitigate" {
		t.Fatalf("expected treatment option fallback, got %q", created.TreatmentOption)
	}
	if created.Probability != 4 {
		t.Fatalf("expected probability fallback 4, got %d", created.Probability)
	}
	if created.Impact != 4 {
		t.Fatalf("expected impact fallback 4, got %d", created.Impact)
	}
	if got := len(created.Cause); got != 1 {
		t.Fatalf("expected cause to stay unchanged, got %d items", got)
	}
	if got := len(created.ImpactDesc); got != 1 {
		t.Fatalf("expected impact description to stay unchanged, got %d items", got)
	}
}

func TestApplyTranscriptRiskChangesRejectsUnauthorizedRole(t *testing.T) {
	riskID := uuid.New()
	repo := &fakeRiskRepository{
		risks: map[uuid.UUID]*entity.Risk{
			riskID: {
				ID:             riskID,
				Code:           "R-111",
				Title:          "Obesitas tidak terpantau",
				Description:    "Deskripsi",
				Status:         "draft",
				VersionGroupID: uuid.New(),
				IsCurrent:      true,
				Probability:    3,
				Impact:         3,
			},
		},
	}

	uc := NewApplyTranscriptRiskChangesUseCase(repo)
	_, err := uc.Execute(context.Background(), ApplyTranscriptRiskChangesInput{
		TargetRiskID: riskID,
		ActorRole:    "reviewer",
		SelectedChanges: []entity.TranscriptRiskChange{
			{ID: "chg-1", Field: "description", Operation: "set", Value: map[string]any{"text": "baru"}},
		},
	})
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}

func cloneRiskForTest(risk *entity.Risk) *entity.Risk {
	if risk == nil {
		return nil
	}

	cloned := *risk
	cloned.Cause = append([]string(nil), risk.Cause...)
	cloned.ImpactDesc = append([]string(nil), risk.ImpactDesc...)
	cloned.Mitigations = append([]entity.Mitigation(nil), risk.Mitigations...)
	return &cloned
}
