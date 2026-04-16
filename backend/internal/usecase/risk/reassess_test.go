package risk

import (
	"context"
	"errors"
	"testing"
	"time"

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
	listReviewQueue   func(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error)
	compareCycles     func(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error)
	riskReviewSummary func(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error)
}

func (r *fakeReassessRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	risk.ID = uuid.New()
	r.createdRisk = cloneRiskForReassessTest(risk)
	return nil
}

func (r *fakeReassessRiskRepo) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
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
func (r *fakeReassessRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
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
func (r *fakeReassessRiskRepo) ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string, search string, page int, limit int) ([]*entity.RiskReviewQueueItem, int, error) {
	if r.listReviewQueue != nil {
		return r.listReviewQueue(ctx, cycle, orgIDs, status, search, page, limit)
	}
	return nil, 0, errors.New("not implemented")
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
func (r *fakeReassessRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReassessRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, errors.New("not implemented")
}

type transactionalReassessRiskRepo struct {
	*fakeReassessRiskRepo
	reservedRisk   *entity.Risk
	reserveCreated bool
	reserveErr     error
	reserveCalls   int
}

func (r *transactionalReassessRiskRepo) GetOrCreatePeriodicReassessmentInTx(context.Context, *entity.Risk, string) (*entity.Risk, bool, error) {
	r.reserveCalls++
	if r.reservedRisk == nil {
		return nil, r.reserveCreated, r.reserveErr
	}
	return cloneRiskForReassessTest(r.reservedRisk), r.reserveCreated, r.reserveErr
}

func TestListRiskReviewQueueUseCase_ExecuteReturnsReviewItems(t *testing.T) {
	repo := &fakeReassessRiskRepo{}
	want := []*entity.RiskReviewQueueItem{{
		RiskID:          uuid.New().String(),
		VersionGroupID:  uuid.New().String(),
		Code:            "R-010",
		Title:           "Keterlambatan logistik vaksin",
		AssessmentCycle: "2026-H1",
		ReviewStatus:    "due",
	}}
	repoList := want
	repo.listReviewQueue = func(_ context.Context, cycle string, _ []uuid.UUID, status string, _ string, _ int, _ int) ([]*entity.RiskReviewQueueItem, int, error) {
		if cycle != "2026-H1" {
			t.Fatalf("expected cycle 2026-H1, got %q", cycle)
		}
		if status != "all" {
			t.Fatalf("expected status all, got %q", status)
		}
		return repoList, len(repoList), nil
	}

	uc := NewListRiskReviewQueueUseCase(repo, nil)
	result, err := uc.Execute(context.Background(), ListRiskReviewQueueInput{Cycle: "2026-H1", Status: "all"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Data) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Data))
	}
	if result.Data[0].ReviewStatus != "due" {
		t.Fatalf("expected due review status, got %q", result.Data[0].ReviewStatus)
	}
}

func TestCompareRiskCyclesUseCase_ExecuteReturnsMovement(t *testing.T) {
	repo := &fakeReassessRiskRepo{}
	repo.compareCycles = func(_ context.Context, fromCycle string, toCycle string, _ []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
		if fromCycle != "2025-H2" {
			t.Fatalf("expected from cycle 2025-H2, got %q", fromCycle)
		}
		if toCycle != "2026-H1" {
			t.Fatalf("expected to cycle 2026-H1, got %q", toCycle)
		}
		return []*entity.RiskCycleComparisonItem{{
			VersionGroupID: uuid.New().String(),
			Code:           "R-022",
			Title:          "Gangguan pengiriman vaksin",
			FromCycle:      fromCycle,
			ToCycle:        toCycle,
			PreviousScore:  8,
			CurrentScore:   12,
			ScoreDelta:     4,
			Movement:       "up",
		}}, nil
	}

	uc := NewCompareRiskCyclesUseCase(repo, nil)
	items, err := uc.Execute(context.Background(), CompareRiskCyclesInput{FromCycle: "2025-H2", ToCycle: "2026-H1"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 comparison, got %d", len(items))
	}
	if items[0].Movement != "up" {
		t.Fatalf("expected movement up, got %q", items[0].Movement)
	}
}

func TestRiskReviewSummaryUseCase_ExecuteReturnsHeatmapAndCompletion(t *testing.T) {
	repo := &fakeReassessRiskRepo{}
	repo.riskReviewSummary = func(_ context.Context, cycle string, _ []uuid.UUID) (*entity.RiskReviewSummary, error) {
		if cycle != "2026-H1" {
			t.Fatalf("expected cycle 2026-H1, got %q", cycle)
		}
		return &entity.RiskReviewSummary{
			Cycle:         cycle,
			PreviousCycle: "2025-H2",
			TotalDue:      10,
			Completed:     6,
			UnitCompletion: []*entity.RiskReviewUnitCompletion{{
				OrgName:        "Dit. Surveilans",
				TotalAssigned:  4,
				Completed:      3,
				CompletionRate: 75,
			}},
			CurrentHeatmap: []*entity.HeatmapCell{{Probability: 4, Impact: 4, Count: 2}},
		}, nil
	}

	uc := NewRiskReviewSummaryUseCase(repo, nil)
	summary, err := uc.Execute(context.Background(), RiskReviewSummaryInput{Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if summary.Completed != 6 {
		t.Fatalf("expected completed 6, got %d", summary.Completed)
	}
	if len(summary.UnitCompletion) != 1 {
		t.Fatalf("expected 1 unit completion row, got %d", len(summary.UnitCompletion))
	}
	if len(summary.CurrentHeatmap) != 1 {
		t.Fatalf("expected 1 current heatmap row, got %d", len(summary.CurrentHeatmap))
	}
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
				Category:          entity.RiskCategoryOperasional,
				Status:            entity.RiskStatusApproved,
				VersionGroupID:    versionGroupID,
				IsCurrent:         true,
				IsCycleCurrent:    true,
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
			Status:          entity.RiskStatusApproved,
			AssessmentCycle: "2025-H2",
		}},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	output, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{RiskID: sourceID, Cycle: "2026-H1"})
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
	if repo.createdRisk.Category != entity.RiskCategoryOperasional {
		t.Fatalf("expected reassessment to preserve category %q, got %q", entity.RiskCategoryOperasional, repo.createdRisk.Category)
	}
	if repo.createdRisk.Status != entity.RiskStatusDraft {
		t.Fatalf("expected draft status, got %q", repo.createdRisk.Status)
	}
	if repo.createdRisk.IsCurrent {
		t.Fatal("expected reassessment draft to be non-current until approval")
	}
	if repo.createdRisk.IsCycleCurrent {
		t.Fatal("expected reassessment draft to have IsCycleCurrent=false until approval")
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
				Status:         entity.RiskStatusApproved,
				VersionGroupID: versionGroupID,
				IsCurrent:      true,
				Probability:    3,
				Impact:         4,
			},
		},
		versions: []*entity.Risk{{
			ID:              uuid.New(),
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusDraft,
			AssessmentCycle: "2026-H1",
		}},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	out, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{RiskID: sourceID, Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("expected no error for in-progress reassessment, got %v", err)
	}
	if out == nil || out.Status != entity.RiskStatusDraft {
		t.Fatalf("expected returning existing draft, got %v", out)
	}
	if repo.createdRisk != nil {
		t.Fatal("expected no new draft when in-progress reassessment exists")
	}
}

func TestCreateRiskReassessmentUseCase_ExecuteAllowsReassessmentAfterApproved(t *testing.T) {
	sourceID := uuid.New()
	versionGroupID := uuid.New()
	repo := &fakeReassessRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			sourceID: {
				ID:              sourceID,
				Code:            "R-003",
				Title:           "Risk dengan reassessment approved",
				Status:          entity.RiskStatusApproved,
				VersionGroupID:  versionGroupID,
				IsCurrent:       true,
				IsCycleCurrent:  true,
				Probability:     3,
				Impact:          4,
				AssessmentCycle: "2026-H1",
			},
		},
		versions: []*entity.Risk{
			{
				ID:              sourceID,
				VersionGroupID:  versionGroupID,
				Status:          entity.RiskStatusApproved,
				AssessmentCycle: "2026-H1",
				IsCurrent:       true,
				IsCycleCurrent:  true,
			},
		},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	output, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{RiskID: sourceID, Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("expected no error for reassessment after approved version, got %v", err)
	}
	if output == nil {
		t.Fatal("expected output")
	}
	if repo.createdRisk == nil {
		t.Fatal("expected a new reassessment draft to be created")
	}
	if repo.createdRisk.AssessmentCycle != "2026-H1" {
		t.Fatalf("expected assessment cycle 2026-H1, got %q", repo.createdRisk.AssessmentCycle)
	}
}

func TestCreateRiskReassessmentUseCase_ExecuteKeepsDraftOnPreliminarySemanticsEvenWithReviewedSnapshot(t *testing.T) {
	sourceID := uuid.New()
	versionGroupID := uuid.New()

	repo := &fakeReassessRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			sourceID: {
				ID:             sourceID,
				Code:           "R-004",
				Title:          "Risk dengan reviewed snapshot",
				Status:         entity.RiskStatusApproved,
				VersionGroupID: versionGroupID,
				IsCurrent:      true,
				IsCycleCurrent: true,
				Probability:    5,
				Impact:         4,
				Weight:         1.15,
				Nilai:          23,
				InherentScore:  23,
			},
		},
		versions: []*entity.Risk{{
			ID:              sourceID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusApproved,
			AssessmentCycle: "2025-H2",
			IsCurrent:       true,
			IsCycleCurrent:  true,
		}},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	_, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{RiskID: sourceID, Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.createdRisk == nil {
		t.Fatal("expected reassessment draft to be created")
	}
	if repo.createdRisk.Status != entity.RiskStatusDraft {
		t.Fatalf("expected draft status, got %q", repo.createdRisk.Status)
	}
	if got := repo.createdRisk.GetEffectiveScore(); got != 23 {
		t.Fatalf("draft GetEffectiveScore() = %d, want preliminary inherent 23", got)
	}
}

func TestCreateRiskReassessmentUseCase_ExecuteUsesRepositoryManagedReservation(t *testing.T) {
	sourceID := uuid.New()
	versionGroupID := uuid.New()
	repo := &transactionalReassessRiskRepo{fakeReassessRiskRepo: &fakeReassessRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			sourceID: {
				ID:             sourceID,
				Code:           "R-080",
				Title:          "Risk reservasi aman",
				Status:         entity.RiskStatusApproved,
				VersionGroupID: versionGroupID,
				IsCurrent:      true,
			},
		},
	},
		reservedRisk: &entity.Risk{
			ID:              uuid.New(),
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusDraft,
			AssessmentCycle: "2026-H1",
		},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	out, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{RiskID: sourceID, Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("expected no error from repository-managed existing in-progress draft, got %v", err)
	}
	if out == nil || out.Status != entity.RiskStatusDraft {
		t.Fatalf("expected returning existing draft, got %v", out)
	}
	if repo.reserveCalls != 1 {
		t.Fatalf("expected repository-managed reservation once, got %d", repo.reserveCalls)
	}
	if repo.createdRisk != nil {
		t.Fatal("expected no new draft creation when reservation reports existing in-progress version")
	}
}

func TestListRiskVersionsUseCase_ExecuteReturnsCategory(t *testing.T) {
	sourceID := uuid.New()
	versionGroupID := uuid.New()
	repo := &fakeReassessRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			sourceID: {
				ID:             sourceID,
				VersionGroupID: versionGroupID,
			},
		},
		versions: []*entity.Risk{
			{
				ID:              uuid.New(),
				VersionGroupID:  versionGroupID,
				AssessmentCycle: "2025-H2",
				Category:        entity.RiskCategoryStrategis,
			},
			{
				ID:              uuid.New(),
				VersionGroupID:  versionGroupID,
				AssessmentCycle: "2026-H1",
				Category:        entity.RiskCategoryOperasional,
			},
		},
	}

	uc := NewListRiskVersionsUseCase(repo)
	versions, err := uc.Execute(context.Background(), sourceID, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(versions) != 2 {
		t.Fatalf("expected 2 versions, got %d", len(versions))
	}
	if versions[0].Category != entity.RiskCategoryStrategis {
		t.Fatalf("expected first version category %q, got %q", entity.RiskCategoryStrategis, versions[0].Category)
	}
	if versions[1].Category != entity.RiskCategoryOperasional {
		t.Fatalf("expected second version category %q, got %q", entity.RiskCategoryOperasional, versions[1].Category)
	}
}

func TestFindInProgressReassessmentForCycleReturnsReusableDraft(t *testing.T) {
	targetID := uuid.New()
	versions := []*entity.Risk{
		{ID: uuid.New(), Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		{ID: targetID, Status: entity.RiskStatusDraft, AssessmentCycle: "2026-H1"},
		{ID: uuid.New(), Status: entity.RiskStatusInReview, AssessmentCycle: "2026-H1"},
	}

	got := FindInProgressReassessmentForCycle(versions, "2026-H1")
	if got == nil {
		t.Fatal("expected reusable draft for cycle")
	}
	if got.ID != targetID {
		t.Fatalf("expected draft %s, got %s", targetID, got.ID)
	}
}

func TestBuildPeriodicReassessmentDraftClonesForTargetCycle(t *testing.T) {
	sourceID := uuid.New()
	startedAt := time.Date(2026, time.April, 11, 10, 30, 0, 0, time.UTC)
	source := &entity.Risk{
		ID:                sourceID,
		Code:              "R-900",
		Title:             "Gangguan distribusi",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    uuid.New(),
		IsCurrent:         true,
		IsCycleCurrent:    true,
		AssessmentCycle:   "2025-H2",
		ReviewType:        "annual",
		Probability:       4,
		Impact:            4,
		Weight:            entity.GetBobot(4, 4),
		Mitigations:       []entity.Mitigation{{ID: uuid.New(), RiskID: sourceID, Action: "Koordinasi", Owner: "Logistik"}},
		ReviewApprovedAt:  &startedAt,
		ReviewSubmittedAt: &startedAt,
	}

	got := BuildPeriodicReassessmentDraft(source, "2026-H1", startedAt)
	if got == nil {
		t.Fatal("expected draft")
	}
	if got.ID != uuid.Nil {
		t.Fatalf("expected zero ID before persistence, got %s", got.ID)
	}
	if got.PreviousRiskID == nil || *got.PreviousRiskID != sourceID {
		t.Fatalf("expected previous risk id %s, got %v", sourceID, got.PreviousRiskID)
	}
	if got.Status != entity.RiskStatusDraft {
		t.Fatalf("expected draft status, got %q", got.Status)
	}
	if got.AssessmentCycle != "2026-H1" {
		t.Fatalf("expected cycle 2026-H1, got %q", got.AssessmentCycle)
	}
	if got.ReviewType != "periodic" {
		t.Fatalf("expected periodic review type, got %q", got.ReviewType)
	}
	if got.ReviewStartedAt == nil || !got.ReviewStartedAt.Equal(startedAt) {
		t.Fatalf("expected startedAt %v, got %v", startedAt, got.ReviewStartedAt)
	}
	if got.ReviewApprovedAt != nil || got.ReviewSubmittedAt != nil {
		t.Fatalf("expected review timestamps to reset, got approved=%v submitted=%v", got.ReviewApprovedAt, got.ReviewSubmittedAt)
	}
	if len(got.Mitigations) != 1 {
		t.Fatalf("expected mitigation clone, got %d", len(got.Mitigations))
	}
	if got.Mitigations[0].ID != uuid.Nil || got.Mitigations[0].RiskID != uuid.Nil {
		t.Fatalf("expected mitigation IDs reset, got id=%s risk_id=%s", got.Mitigations[0].ID, got.Mitigations[0].RiskID)
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
