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

type fakeMonitoringRiskRepo struct {
	risks    map[uuid.UUID]*entity.Risk
	created  []*entity.Risk
	versions []*entity.Risk
}

func (r *fakeMonitoringRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	risk.ID = uuid.New()
	r.created = append(r.created, risk)
	return nil
}

func (r *fakeMonitoringRiskRepo) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	risk, ok := r.risks[id]
	if !ok {
		return nil, domainerrors.ErrRiskNotFound
	}
	return cloneRiskForMonitoringTest(risk), nil
}

func (r *fakeMonitoringRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *fakeMonitoringRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *fakeMonitoringRiskRepo) List(_ context.Context, orgIDs []uuid.UUID, status string, _ string) ([]*entity.Risk, error) {
	var result []*entity.Risk
	for _, risk := range r.risks {
		if risk.Status == status {
			if len(orgIDs) == 0 {
				result = append(result, cloneRiskForMonitoringTest(risk))
			} else {
				for _, orgID := range orgIDs {
					if risk.OrganizationID != nil && *risk.OrganizationID == orgID {
						result = append(result, cloneRiskForMonitoringTest(risk))
					}
				}
			}
		}
	}
	return result, nil
}
func (r *fakeMonitoringRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (r *fakeMonitoringRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", nil
}
func (r *fakeMonitoringRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) ListVersions(_ context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	var result []*entity.Risk
	for _, v := range r.versions {
		if v.VersionGroupID == versionGroupID {
			result = append(result, cloneRiskForMonitoringTest(v))
		}
	}
	return result, nil
}
func (r *fakeMonitoringRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return nil
}
func (r *fakeMonitoringRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (r *fakeMonitoringRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *fakeMonitoringRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

var _ repo.RiskRepository = (*fakeMonitoringRiskRepo)(nil)

type fakeMonitoringUserRepo struct{}

func (r *fakeMonitoringUserRepo) Create(context.Context, *entity.User) error { return nil }
func (r *fakeMonitoringUserRepo) GetByID(context.Context, uuid.UUID) (*entity.User, error) {
	return &entity.User{ID: uuid.New(), Name: "Monitor Tester"}, nil
}
func (r *fakeMonitoringUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (r *fakeMonitoringUserRepo) GetByNIP(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (r *fakeMonitoringUserRepo) Update(context.Context, *entity.User) error   { return nil }
func (r *fakeMonitoringUserRepo) Delete(context.Context, uuid.UUID) error      { return nil }
func (r *fakeMonitoringUserRepo) List(context.Context) ([]*entity.User, error) { return nil, nil }
func (r *fakeMonitoringUserRepo) ListWithFilter(context.Context, repo.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

var _ repo.UserRepository = (*fakeMonitoringUserRepo)(nil)

// testBatchStarter preserves the pre-monitoring test fixture semantics while
// exercising the batch use case through its explicit starter dependency. The
// production constructor is wired to StartMonitoringUseCase.
type testBatchStarter struct {
	riskRepo repo.RiskRepository
}

func (s *testBatchStarter) Execute(ctx context.Context, input StartMonitoringInput) (*StartMonitoringOutput, error) {
	source, err := s.riskRepo.GetByID(ctx, input.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, err
	}
	versions, err := s.riskRepo.ListVersions(ctx, source.VersionGroupID)
	if err != nil {
		return nil, err
	}
	for _, version := range versions {
		if version.AssessmentCycle == input.Cycle && version.Status == entity.RiskStatusDraft {
			monitoring := &entity.RiskMonitoring{ID: version.ID, AssessmentCycle: input.Cycle, Status: entity.RiskMonitoringStatusDraft}
			return &StartMonitoringOutput{Monitoring: monitoring, ExistingDraft: true}, nil
		}
	}
	draft := BuildPeriodicReassessmentDraft(source, input.Cycle, source.CreatedAt, input.StartedBy)
	draft.Probability = input.ObservedProbability
	draft.Impact = input.ObservedImpact
	draft.Weight = entity.GetBobot(input.ObservedProbability, input.ObservedImpact)
	draft.CalculateAll()
	if err := s.riskRepo.Create(ctx, draft); err != nil {
		return nil, err
	}
	return &StartMonitoringOutput{
		Monitoring: &entity.RiskMonitoring{ID: draft.ID, AssessmentCycle: input.Cycle, Status: entity.RiskMonitoringStatusDraft},
	}, nil
}

func newTestCreateMonitoringBatchUseCase(riskRepo repo.RiskRepository) *CreateMonitoringBatchUseCase {
	return NewCreateMonitoringBatchUseCase(riskRepo, &testBatchStarter{riskRepo: riskRepo})
}

func cloneRiskForMonitoringTest(risk *entity.Risk) *entity.Risk {
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

func TestCreateMonitoringBatchUseCase_ExecuteCreatesDrafts(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:             risk1ID,
		Code:           "R-001",
		Title:          "Risk satu",
		Status:         entity.RiskStatusApproved,
		VersionGroupID: vg1ID,
		IsCurrent:      true,
		IsCycleCurrent: true,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         4,
		Weight:         1.0,
		Category:       entity.RiskCategoryOperasional,
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
		},
	}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-001", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected status created, got %q: %s", result.Items[0].Status, result.Items[0].Error)
	}
	if len(riskRepo.created) != 1 {
		t.Fatalf("expected 1 created draft, got %d", len(riskRepo.created))
	}

	draft := riskRepo.created[0]
	if draft.Probability != 3 {
		t.Fatalf("expected draft Probability 3, got %d", draft.Probability)
	}
	if draft.Impact != 3 {
		t.Fatalf("expected draft Impact 3, got %d", draft.Impact)
	}
	expectedWeight := entity.GetBobot(3, 3)
	if draft.Weight != expectedWeight {
		t.Fatalf("expected draft Weight %f, got %f", expectedWeight, draft.Weight)
	}
	if draft.AssessmentCycle != "2026-Q2" {
		t.Fatalf("expected AssessmentCycle 2026-Q2, got %q", draft.AssessmentCycle)
	}
	if draft.ReviewType != "periodic" {
		t.Fatalf("expected ReviewType periodic, got %q", draft.ReviewType)
	}
	if draft.Status != entity.RiskStatusDraft {
		t.Fatalf("expected draft status, got %q", draft.Status)
	}
	if draft.IsCurrent {
		t.Fatal("expected IsCurrent=false for reassessment draft")
	}
}

func TestCreateMonitoringBatchUseCase_RejectsInvalidCycle(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()

	uc := newTestCreateMonitoringBatchUseCase(&fakeMonitoringRiskRepo{})

	_, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items:          []BulkMonitoringBatchItemInput{},
		Cycle:          "invalid",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err == nil {
		t.Fatal("expected error for invalid cycle format")
	}
}

func TestCreateMonitoringBatchUseCase_RejectsNilCreatedBy(t *testing.T) {
	orgID := uuid.New()

	uc := newTestCreateMonitoringBatchUseCase(&fakeMonitoringRiskRepo{})

	_, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items:          []BulkMonitoringBatchItemInput{},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      nil,
	})

	if err == nil {
		t.Fatal("expected error for nil CreatedBy")
	}
}

func TestCreateMonitoringBatchUseCase_FailsForUnknownCode(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()

	riskRepo := &fakeMonitoringRiskRepo{risks: map[uuid.UUID]*entity.Risk{}}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-999", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no batch-level error, got %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Status != "failed" {
		t.Fatalf("expected failed status, got %q", result.Items[0].Status)
	}
}

func TestCreateMonitoringBatchUseCase_FailsForNonApprovedRisk(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: {
				ID:             risk1ID,
				Code:           "R-001",
				Title:          "Draft risk",
				Status:         entity.RiskStatusDraft,
				VersionGroupID: vg1ID,
				IsCurrent:      false,
				OrganizationID: &orgID,
			},
		},
	}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-001", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no batch-level error, got %v", err)
	}
	if result.Items[0].Status != "failed" {
		t.Fatalf("expected failed for draft risk, got %q", result.Items[0].Status)
	}
}

func TestCreateMonitoringBatchUseCase_FailsForExistingDraft(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:             risk1ID,
		Code:           "R-001",
		Title:          "Risk with existing draft",
		Status:         entity.RiskStatusApproved,
		VersionGroupID: vg1ID,
		IsCurrent:      true,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         4,
	}

	existingDraftID := uuid.New()

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
			{ID: existingDraftID, VersionGroupID: vg1ID, Status: entity.RiskStatusDraft, AssessmentCycle: "2026-Q2"},
		},
	}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-001", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no batch-level error, got %v", err)
	}
	if result.Items[0].Status != "failed" {
		t.Fatalf("expected failed for existing draft, got %q", result.Items[0].Status)
	}
	if len(riskRepo.created) != 0 {
		t.Fatalf("expected 0 created drafts, got %d", len(riskRepo.created))
	}
}

func TestCreateMonitoringBatchUseCase_PartialSuccess(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:             risk1ID,
		Code:           "R-001",
		Title:          "Valid risk",
		Status:         entity.RiskStatusApproved,
		VersionGroupID: vg1ID,
		IsCurrent:      true,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         4,
		Weight:         1.0,
		Category:       entity.RiskCategoryOperasional,
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
		},
	}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-001", RealisasiP: 3, RealisasiD: 3},
			{ClientKey: "row-2", Code: "R-999", RealisasiP: 2, RealisasiD: 2},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no batch-level error, got %v", err)
	}
	if len(result.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(result.Items))
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected first item created, got %q", result.Items[0].Status)
	}
	if result.Items[1].Status != "failed" {
		t.Fatalf("expected second item failed, got %q", result.Items[1].Status)
	}
	if len(riskRepo.created) != 1 {
		t.Fatalf("expected 1 created draft, got %d", len(riskRepo.created))
	}
}

func TestCreateMonitoringBatchUseCase_ComputesWeightAndNilai(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:             risk1ID,
		Code:           "R-050",
		Title:          "Risk with scoring",
		Status:         entity.RiskStatusApproved,
		VersionGroupID: vg1ID,
		IsCurrent:      true,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         4,
		Weight:         1.0,
		Category:       entity.RiskCategoryOperasional,
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
		},
	}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-050", RealisasiP: 2, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected created, got %q: %s", result.Items[0].Status, result.Items[0].Error)
	}

	draft := riskRepo.created[0]
	expectedWeight := entity.GetBobot(2, 3)
	if draft.Weight != expectedWeight {
		t.Fatalf("expected Weight %f, got %f", expectedWeight, draft.Weight)
	}
	expectedNilai := entity.CalculateNilai(2, 3, expectedWeight)
	if draft.Nilai != expectedNilai {
		t.Fatalf("expected Nilai %f, got %f", expectedNilai, draft.Nilai)
	}
	if draft.InherentScore != 11 {
		t.Fatalf("expected rounded InherentScore 11, got %d", draft.InherentScore)
	}
}

func TestCreateMonitoringBatchUseCase_PreservesSourceRiskFields(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:             risk1ID,
		Code:           "R-100",
		Title:          "Risk with details",
		Description:    "Detailed description",
		Category:       entity.RiskCategoryKebijakan,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: vg1ID,
		IsCurrent:      true,
		IsCycleCurrent: true,
		OrganizationID: &orgID,
		Probability:    5,
		Impact:         4,
		Weight:         1.15,
		Cause:          []string{"Cause A", "Cause B"},
		ImpactDesc:     []string{"Impact X"},
		Mitigations: []entity.Mitigation{
			{ID: uuid.New(), RiskID: risk1ID, Action: "Mitigate", Owner: "Team"},
		},
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
		},
	}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-100", RealisasiP: 3, RealisasiD: 2},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected created, got %q", result.Items[0].Status)
	}

	draft := riskRepo.created[0]
	if draft.Code != "R-100" {
		t.Fatalf("expected Code R-100, got %q", draft.Code)
	}
	if draft.Title != "Risk with details" {
		t.Fatalf("expected Title preserved, got %q", draft.Title)
	}
	if draft.Category != entity.RiskCategoryKebijakan {
		t.Fatalf("expected Category preserved, got %q", draft.Category)
	}
	if draft.VersionGroupID != vg1ID {
		t.Fatalf("expected VersionGroupID preserved")
	}
	if draft.PreviousRiskID == nil || *draft.PreviousRiskID != risk1ID {
		t.Fatalf("expected PreviousRiskID to point to source risk")
	}
	if len(draft.Cause) != 2 {
		t.Fatalf("expected 2 causes cloned, got %d", len(draft.Cause))
	}
	if len(draft.Mitigations) != 1 {
		t.Fatalf("expected 1 mitigation cloned, got %d", len(draft.Mitigations))
	}
	if draft.Mitigations[0].ID != uuid.Nil {
		t.Fatalf("expected mitigation ID reset to Nil, got %s", draft.Mitigations[0].ID)
	}
}

func TestCreateMonitoringBatchUseCase_UsesFullRiskDetailsForMitigations(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:             risk1ID,
		Code:           "R-101",
		Title:          "Risk with hidden mitigations",
		Status:         entity.RiskStatusApproved,
		VersionGroupID: vg1ID,
		IsCurrent:      true,
		IsCycleCurrent: true,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         4,
		Weight:         1.0,
		Mitigations: []entity.Mitigation{
			{
				ID:                    uuid.New(),
				RiskID:                risk1ID,
				Action:                "Follow up vendor",
				Owner:                 "PIC Logistik",
				DueDate:               stringPtr("2026-05-31"),
				Frequency:             "mingguan",
				ExecutionScheduleText: "Setiap Senin",
			},
		},
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
		},
	}

	uc := newTestCreateMonitoringBatchUseCase(&monitoringBatchListStrippingRepo{fakeMonitoringRiskRepo: riskRepo})

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-101", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected created, got %q: %s", result.Items[0].Status, result.Items[0].Error)
	}
	if len(riskRepo.created) != 1 {
		t.Fatalf("expected 1 created draft, got %d", len(riskRepo.created))
	}

	draft := riskRepo.created[0]
	if len(draft.Mitigations) != 1 {
		t.Fatalf("expected 1 mitigation cloned, got %d", len(draft.Mitigations))
	}
	if draft.Mitigations[0].Owner != "PIC Logistik" {
		t.Fatalf("expected mitigation owner preserved, got %q", draft.Mitigations[0].Owner)
	}
	if draft.Mitigations[0].ExecutionScheduleText != "Setiap Senin" {
		t.Fatalf("expected execution schedule preserved, got %q", draft.Mitigations[0].ExecutionScheduleText)
	}
}

type monitoringBatchListStrippingRepo struct {
	*fakeMonitoringRiskRepo
}

func (r *monitoringBatchListStrippingRepo) List(_ context.Context, orgIDs []uuid.UUID, status string, _ string) ([]*entity.Risk, error) {
	var result []*entity.Risk
	for _, risk := range r.risks {
		if risk.Status != status {
			continue
		}
		if len(orgIDs) > 0 {
			matchesOrg := false
			for _, orgID := range orgIDs {
				if risk.OrganizationID != nil && *risk.OrganizationID == orgID {
					matchesOrg = true
					break
				}
			}
			if !matchesOrg {
				continue
			}
		}

		clone := *risk
		clone.Mitigations = nil
		result = append(result, &clone)
	}
	return result, nil
}

var _ repo.RiskRepository = (*monitoringBatchListStrippingRepo)(nil)

func TestCreateMonitoringBatchUseCase_RepoCreateFailure(t *testing.T) {
	orgID := uuid.New()
	createdBy := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:             risk1ID,
		Code:           "R-200",
		Title:          "Risk for repo failure",
		Status:         entity.RiskStatusApproved,
		VersionGroupID: vg1ID,
		IsCurrent:      true,
		OrganizationID: &orgID,
		Probability:    3,
		Impact:         3,
	}

	riskRepo := &fakeMonitoringFailingRepo{
		fakeMonitoringRiskRepo: &fakeMonitoringRiskRepo{
			risks: map[uuid.UUID]*entity.Risk{
				risk1ID: risk1,
			},
			versions: []*entity.Risk{
				{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
			},
		},
		createErr: errors.New("database connection lost"),
	}

	uc := newTestCreateMonitoringBatchUseCase(riskRepo)

	result, err := uc.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-200", RealisasiP: 2, RealisasiD: 2},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &createdBy,
	})

	if err != nil {
		t.Fatalf("expected no batch-level error, got %v", err)
	}
	if result.Items[0].Status != "failed" {
		t.Fatalf("expected failed status on repo error, got %q", result.Items[0].Status)
	}
}

type fakeMonitoringFailingRepo struct {
	*fakeMonitoringRiskRepo
	createErr error
}

func (r *fakeMonitoringFailingRepo) Create(_ context.Context, risk *entity.Risk) error {
	return r.createErr
}

var _ repo.RiskRepository = (*fakeMonitoringFailingRepo)(nil)

// TestIntegration_TemplatePreviewBatchCreate tests the full Template → Preview → Batch create flow.
// This is the primary integration test for the monitoring feature.
func TestIntegration_TemplatePreviewBatchCreate(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Integration Test Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		IsCycleCurrent:    true,
		OrganizationID:    &orgID,
		Probability:       4,
		Impact:            4,
		Weight:            1.0,
		Category:          entity.RiskCategoryOperasional,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
		},
	}

	orgRepo := &fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}
	userRepo := &fakeMonitoringUserRepo{}

	// Step 1: Generate template
	monitoringUC := NewBulkMonitoringSpreadsheetUseCase(orgRepo, userRepo, riskRepo)
	templateContent, _, err := monitoringUC.Template(context.Background(), orgID, "2026-Q2")
	if err != nil {
		t.Fatalf("step 1 - template generation failed: %v", err)
	}
	if len(templateContent) == 0 {
		t.Fatal("step 1 - template content is empty")
	}

	// Step 2: Preview the template (round-trip)
	previewResult, err := monitoringUC.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "template.xlsx",
		Content:        templateContent,
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-Q2",
	})
	if err != nil {
		t.Fatalf("step 2 - preview failed: %v", err)
	}
	if len(previewResult.Items) != 1 {
		t.Fatalf("step 2 - expected 1 preview item, got %d", len(previewResult.Items))
	}
	previewItem := previewResult.Items[0]
	if previewItem.Code != "R-001" {
		t.Fatalf("step 2 - expected code R-001, got %q", previewItem.Code)
	}
	if previewItem.TargetP != 2 {
		t.Fatalf("step 2 - expected TargetP=2, got %d", previewItem.TargetP)
	}
	if previewItem.TargetD != 3 {
		t.Fatalf("step 2 - expected TargetD=3, got %d", previewItem.TargetD)
	}

	// Step 3: Batch create from preview data
	batchUC := newTestCreateMonitoringBatchUseCase(riskRepo)
	batchResult, err := batchUC.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-001", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &uploaderID,
	})
	if err != nil {
		t.Fatalf("step 3 - batch create failed: %v", err)
	}
	if len(batchResult.Items) != 1 {
		t.Fatalf("step 3 - expected 1 batch item, got %d", len(batchResult.Items))
	}
	if batchResult.Items[0].Status != "created" {
		t.Fatalf("step 3 - expected status created, got %q: %s", batchResult.Items[0].Status, batchResult.Items[0].Error)
	}

	// Verify the created draft has correct monitoring fields
	draft := riskRepo.created[0]
	if draft.Probability != 3 {
		t.Fatalf("step 3 - expected draft Probability 3, got %d", draft.Probability)
	}
	if draft.Impact != 3 {
		t.Fatalf("step 3 - expected draft Impact 3, got %d", draft.Impact)
	}
	if draft.AssessmentCycle != "2026-Q2" {
		t.Fatalf("step 3 - expected AssessmentCycle 2026-Q2, got %q", draft.AssessmentCycle)
	}
	if draft.ReviewType != "periodic" {
		t.Fatalf("step 3 - expected ReviewType periodic, got %q", draft.ReviewType)
	}
	if draft.Status != entity.RiskStatusDraft {
		t.Fatalf("step 3 - expected draft status, got %q", draft.Status)
	}
	if draft.IsCurrent {
		t.Fatal("step 3 - expected IsCurrent=false for reassessment draft")
	}
}

// TestIntegration_MonitoringPreviewThenBatchWithInvalidCode tests that
// preview warnings/errors for unknown codes carry through to batch create failures.
func TestIntegration_MonitoringPreviewThenBatchWithInvalidCode(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()

	riskRepo := &fakeMonitoringRiskRepo{
		risks:    map[uuid.UUID]*entity.Risk{},
		versions: []*entity.Risk{},
	}

	orgRepo := &fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}
	userRepo := &fakeMonitoringUserRepo{}

	// Preview with unknown code
	monitoringUC := NewBulkMonitoringSpreadsheetUseCase(orgRepo, userRepo, riskRepo)
	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-999", "Unknown Risk", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
	}

	previewResult, err := monitoringUC.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-Q2",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(previewResult.Items) != 1 {
		t.Fatalf("expected 1 preview item, got %d", len(previewResult.Items))
	}
	// Preview should flag the unknown code as an error
	hasNotFoundErr := false
	for _, e := range previewResult.Items[0].Errors {
		if e == "Risiko dengan kode 'R-999' tidak ditemukan." {
			hasNotFoundErr = true
		}
	}
	if !hasNotFoundErr {
		t.Fatalf("expected 'not found' error in preview, got %v", previewResult.Items[0].Errors)
	}

	// Batch create should also fail for unknown code
	batchUC := newTestCreateMonitoringBatchUseCase(riskRepo)
	batchResult, err := batchUC.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-999", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &uploaderID,
	})
	if err != nil {
		t.Fatalf("expected no batch-level error, got %v", err)
	}
	if batchResult.Items[0].Status != "failed" {
		t.Fatalf("expected failed status for unknown code, got %q", batchResult.Items[0].Status)
	}
}

// TestIntegration_MonitoringPreviewThenBatchWithExistingDraft tests that
// preview warnings for existing drafts match batch create failures.
func TestIntegration_MonitoringPreviewThenBatchWithExistingDraft(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Risk with existing draft",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	existingDraftID := uuid.New()
	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-Q4"},
			{ID: existingDraftID, VersionGroupID: vg1ID, Status: entity.RiskStatusDraft, AssessmentCycle: "2026-Q2"},
		},
	}

	orgRepo := &fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}
	userRepo := &fakeMonitoringUserRepo{}

	// Preview should warn about existing draft
	monitoringUC := NewBulkMonitoringSpreadsheetUseCase(orgRepo, userRepo, riskRepo)
	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Risk with existing draft", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
	}

	previewResult, err := monitoringUC.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-Q2",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(previewResult.Items[0].Warnings) == 0 {
		t.Fatal("expected warning for existing draft in preview")
	}

	// Batch create should fail for existing draft
	batchUC := newTestCreateMonitoringBatchUseCase(riskRepo)
	batchResult, err := batchUC.Execute(context.Background(), CreateMonitoringBatchInput{
		Items: []BulkMonitoringBatchItemInput{
			{ClientKey: "row-1", Code: "R-001", RealisasiP: 3, RealisasiD: 3},
		},
		Cycle:          "2026-Q2",
		OrganizationID: orgID,
		CreatedBy:      &uploaderID,
	})
	if err != nil {
		t.Fatalf("expected no batch-level error, got %v", err)
	}
	if batchResult.Items[0].Status != "failed" {
		t.Fatalf("expected failed status for existing draft, got %q", batchResult.Items[0].Status)
	}
}

// TestIntegration_MonitoringInvalidCycleRejectedByBothPaths tests that
// invalid cycle format is rejected consistently by both preview and batch create.
func TestIntegration_MonitoringInvalidCycleRejectedByBothPaths(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()

	riskRepo := &fakeMonitoringRiskRepo{risks: map[uuid.UUID]*entity.Risk{}, versions: []*entity.Risk{}}
	orgRepo := &fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}
	userRepo := &fakeMonitoringUserRepo{}

	// Preview should reject invalid cycle
	monitoringUC := NewBulkMonitoringSpreadsheetUseCase(orgRepo, userRepo, riskRepo)
	_, err := monitoringUC.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        []byte{},
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "invalid-cycle",
	})
	if err == nil {
		t.Fatal("expected preview to reject invalid cycle format")
	}

	// Batch create should also reject invalid cycle
	batchUC := newTestCreateMonitoringBatchUseCase(riskRepo)
	_, err = batchUC.Execute(context.Background(), CreateMonitoringBatchInput{
		Items:          []BulkMonitoringBatchItemInput{},
		Cycle:          "invalid-cycle",
		OrganizationID: orgID,
		CreatedBy:      &uploaderID,
	})
	if err == nil {
		t.Fatal("expected batch create to reject invalid cycle format")
	}
}
