package risk

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeReassessRiskRepo struct {
	risks             map[uuid.UUID]*entity.Risk
	createdRisk       *entity.Risk
	versions          []*entity.Risk
	listCycleSnapshot func(context.Context, string, []uuid.UUID) ([]*entity.Risk, error)
	listReviewQueue   func(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error)
	compareCycles     func(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error)
	riskReviewSummary func(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error)
}

func (r *fakeReassessRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	risk.ID = uuid.New()
	r.createdRisk = cloneRiskForReassessTest(risk)
	return nil
}

func (r *fakeReassessRiskRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Risk, error) {
	risk, ok := r.risks[id]
	if !ok {
		return nil, domainerrors.ErrRiskNotFound
	}
	return cloneRiskForReassessTest(risk), nil
}

func (r *fakeReassessRiskRepo) Update(context.Context, *entity.Risk) error {
	return errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) DashboardSummary(context.Context) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) HeatmapData(context.Context) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) TopRisks(context.Context, int) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) ListVersions(_ context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	var result []*entity.Risk
	for _, version := range r.versions {
		if version.VersionGroupID == versionGroupID {
			result = append(result, cloneRiskForReassessTest(version))
		}
	}
	return result, nil
}
func (r *fakeReassessRiskRepo) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	if r.listCycleSnapshot != nil {
		return r.listCycleSnapshot(ctx, cycle, orgIDs)
	}
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string) ([]*entity.RiskReviewQueueItem, error) {
	if r.listReviewQueue != nil {
		return r.listReviewQueue(ctx, cycle, orgIDs, status)
	}
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	if r.compareCycles != nil {
		return r.compareCycles(ctx, fromCycle, toCycle, orgIDs)
	}
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) RiskReviewSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.RiskReviewSummary, error) {
	if r.riskReviewSummary != nil {
		return r.riskReviewSummary(ctx, cycle, orgIDs)
	}
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}

var _ repo.RiskRepository = (*fakeReassessRiskRepo)(nil)

func TestCreateRiskReassessmentUseCase_ExecuteClonesCurrentApprovedRisk(t *testing.T) {
	sourceID := uuid.New()
	versionGroupID := uuid.New()
	repo := &fakeReassessRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			sourceID: {
				ID:                sourceID,
				Code:              "R-001",
				Title:             "Keterlambatan distribusi vaksin",
				Description:       "Risiko existing",
				Status:            "approved",
				VersionGroupID:    versionGroupID,
				IsCurrent:         true,
				Probability:       4,
				Impact:            4,
				Weight:            1,
				TargetProbability: 2,
				TargetImpact:      2,
				TargetWeight:      1,
				NextReviewDate:    stringPtr("2026-06-30"),
				Mitigations: []entity.Mitigation{{
					ID:        uuid.New(),
					RiskID:    sourceID,
					Action:    "Perkuat koordinasi logistik",
					Owner:     "Tim gudang",
					Frequency: "bulanan",
				}},
			},
		},
		versions: []*entity.Risk{{
			ID:              sourceID,
			VersionGroupID:  versionGroupID,
			Status:          "approved",
			AssessmentCycle: "2025-H2",
		}},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	output, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{
		RiskID: sourceID,
		Cycle:  "2026-H1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if output == nil {
		t.Fatal("expected output")
	}
	if repo.createdRisk == nil {
		t.Fatal("expected a cloned risk to be created")
	}
	if repo.createdRisk.PreviousRiskID == nil || *repo.createdRisk.PreviousRiskID != sourceID {
		t.Fatalf("expected previous risk id %s, got %v", sourceID, repo.createdRisk.PreviousRiskID)
	}
	if repo.createdRisk.VersionGroupID != versionGroupID {
		t.Fatalf("expected version group %s, got %s", versionGroupID, repo.createdRisk.VersionGroupID)
	}
	if repo.createdRisk.Code != "R-001" {
		t.Fatalf("expected reassessment to preserve risk code, got %q", repo.createdRisk.Code)
	}
	if repo.createdRisk.Status != "draft" {
		t.Fatalf("expected draft status, got %q", repo.createdRisk.Status)
	}
	if repo.createdRisk.IsCurrent {
		t.Fatal("expected reassessment draft to be non-current until approval")
	}
	if repo.createdRisk.AssessmentCycle != "2026-H1" {
		t.Fatalf("expected assessment cycle 2026-H1, got %q", repo.createdRisk.AssessmentCycle)
	}
	if repo.createdRisk.ReviewType != "periodic" {
		t.Fatalf("expected periodic review type, got %q", repo.createdRisk.ReviewType)
	}
	if len(repo.createdRisk.Mitigations) != 1 {
		t.Fatalf("expected 1 mitigation, got %d", len(repo.createdRisk.Mitigations))
	}
	if repo.createdRisk.Mitigations[0].ID != uuid.Nil {
		t.Fatal("expected mitigation IDs to be reset on clone")
	}
}

func TestCreateRiskReassessmentUseCase_ExecuteRejectsDuplicateCycle(t *testing.T) {
	sourceID := uuid.New()
	versionGroupID := uuid.New()
	repo := &fakeReassessRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			sourceID: {
				ID:             sourceID,
				Code:           "R-002",
				Title:          "Gangguan cold chain",
				Status:         "approved",
				VersionGroupID: versionGroupID,
				IsCurrent:      true,
				Probability:    3,
				Impact:         4,
			},
		},
		versions: []*entity.Risk{{
			ID:              uuid.New(),
			VersionGroupID:  versionGroupID,
			Status:          "draft",
			AssessmentCycle: "2026-H1",
		}},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	_, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{
		RiskID: sourceID,
		Cycle:  "2026-H1",
	})
	if !errors.Is(err, domainerrors.ErrInvalidStatus) {
		t.Fatalf("expected invalid status error for duplicate cycle, got %v", err)
	}
	if repo.createdRisk != nil {
		t.Fatal("expected no new draft for duplicate cycle")
	}
}

func cloneRiskForReassessTest(risk *entity.Risk) *entity.Risk {
	if risk == nil {
		return nil
	}
	clone := *risk
	clone.Cause = append([]string(nil), risk.Cause...)
	clone.ImpactDesc = append([]string(nil), risk.ImpactDesc...)
	if len(risk.Mitigations) > 0 {
		clone.Mitigations = make([]entity.Mitigation, len(risk.Mitigations))
		copy(clone.Mitigations, risk.Mitigations)
	}
	return &clone
}

func stringPtr(value string) *string {
	return &value
}
