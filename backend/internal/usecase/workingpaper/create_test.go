package workingpaper

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeCreateRiskRepo struct {
	risksByID   map[uuid.UUID]*entity.Risk
	versions    []*entity.Risk
	createdRisk *entity.Risk
	gotOrgIDs   []uuid.UUID
}

func (r *fakeCreateRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	if risk.ID == uuid.Nil {
		risk.ID = uuid.New()
	}
	r.createdRisk = cloneCreateRisk(risk)
	return nil
}

func (r *fakeCreateRiskRepo) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	r.gotOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	risk, ok := r.risksByID[id]
	if !ok {
		return nil, domainerrors.ErrRiskNotFound
	}
	return cloneCreateRisk(risk), nil
}

func (r *fakeCreateRiskRepo) Update(context.Context, *entity.Risk) error {
	return nil
}

func (r *fakeCreateRiskRepo) Delete(context.Context, uuid.UUID) error {
	return nil
}

func (r *fakeCreateRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}

func (r *fakeCreateRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", nil
}

func (r *fakeCreateRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) ListVersions(_ context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	versions := make([]*entity.Risk, 0)
	for _, version := range r.versions {
		if version.VersionGroupID == versionGroupID {
			versions = append(versions, cloneCreateRisk(version))
		}
	}
	return versions, nil
}

func (r *fakeCreateRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return nil
}

func (r *fakeCreateRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}

func (r *fakeCreateRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}

func (r *fakeCreateRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type transactionalCreateRiskRepo struct {
	*fakeCreateRiskRepo
	reservedRisk   *entity.Risk
	reserveCreated bool
	reserveErr     error
	reserveCalls   int
}

func (r *transactionalCreateRiskRepo) GetOrCreatePeriodicReassessmentInTx(_ context.Context, _ *entity.Risk, _ string, _ uuid.UUID) (*entity.Risk, bool, error) {
	r.reserveCalls++
	if r.reservedRisk == nil {
		return nil, r.reserveCreated, r.reserveErr
	}
	return cloneCreateRisk(r.reservedRisk), r.reserveCreated, r.reserveErr
}

type fakeCreateWorkingPaperRepo struct {
	created              *entity.WorkingPaper
	countByOrgAndCycleFn func(uuid.UUID, string) int
}

func (r *fakeCreateWorkingPaperRepo) Create(_ context.Context, wp *entity.WorkingPaper) error {
	r.created = wp
	return nil
}

func (r *fakeCreateWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}

func (r *fakeCreateWorkingPaperRepo) List(context.Context, []uuid.UUID, string, string, string, string, int, int) ([]*entity.WorkingPaper, int, error) {
	return nil, 0, nil
}

func (r *fakeCreateWorkingPaperRepo) Update(context.Context, *entity.WorkingPaper) error {
	return nil
}

func (r *fakeCreateWorkingPaperRepo) Delete(context.Context, uuid.UUID) error {
	return nil
}

func (r *fakeCreateWorkingPaperRepo) MutateByIDForUpdate(context.Context, uuid.UUID, func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	return nil, nil
}

func (r *fakeCreateWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return nil, nil
}

func (r *fakeCreateWorkingPaperRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error {
	return nil
}

func (r *fakeCreateWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) {
	return nil, nil
}

func (r *fakeCreateWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) {
	return 0, nil
}

func (r *fakeCreateWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) {
	return false, nil
}

func (r *fakeCreateWorkingPaperRepo) CountByOrgAndCycle(_ context.Context, _ uuid.UUID, _ string) (int, error) {
	if r.countByOrgAndCycleFn != nil {
		return r.countByOrgAndCycleFn(uuid.Nil, ""), nil
	}
	return 0, nil
}

type fakeCreateMonitoringRepo struct {
	draftBySourceAndCycle        *entity.RiskMonitoring
	hasFinalizedForSourceAndCycle bool
	createdMonitorings           []*entity.RiskMonitoring
}

func (r *fakeCreateMonitoringRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.RiskMonitoring, error) {
	return nil, nil
}

func (r *fakeCreateMonitoringRepo) GetDraftBySourceAndCycle(_ context.Context, _ uuid.UUID, _ string) (*entity.RiskMonitoring, error) {
	return r.draftBySourceAndCycle, nil
}

func (r *fakeCreateMonitoringRepo) HasFinalizedForSourceAndCycle(_ context.Context, _ uuid.UUID, _ string) (bool, error) {
	return r.hasFinalizedForSourceAndCycle, nil
}

func (r *fakeCreateMonitoringRepo) GetByVersionGroupAndCycle(_ context.Context, _ uuid.UUID, _ string) (*entity.RiskMonitoring, error) {
	return r.draftBySourceAndCycle, nil
}

func (r *fakeCreateMonitoringRepo) List(context.Context, repo.RiskMonitoringListFilter) ([]*entity.RiskMonitoring, int, error) {
	return nil, 0, nil
}

func (r *fakeCreateMonitoringRepo) Create(_ context.Context, monitoring *entity.RiskMonitoring) error {
	r.createdMonitorings = append(r.createdMonitorings, monitoring)
	return nil
}

func (r *fakeCreateMonitoringRepo) UpdateDraft(context.Context, *entity.RiskMonitoring) error {
	return nil
}

func (r *fakeCreateMonitoringRepo) Finalize(context.Context, uuid.UUID, *entity.Risk, uuid.UUID) (*entity.RiskMonitoring, error) {
	return nil, nil
}

func TestCreateLatestApprovedLinksTheExactApprovedRiskID(t *testing.T) {
	orgID := uuid.New()
	approvedID := uuid.New()
	versionGroupID := uuid.New()

	riskRepo := &fakeCreateRiskRepo{risksByID: map[uuid.UUID]*entity.Risk{
		approvedID: {
			ID:              approvedID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2026-H1",
			Code:            "R-001",
			Title:           "Gangguan server",
			Category:        entity.RiskCategoryOperasional,
			Probability:     4,
			Impact:          5,
			Weight:          entity.GetBobot(4, 5),
		},
	}}
	wpRepo := &fakeCreateWorkingPaperRepo{}
	monRepo := &fakeCreateMonitoringRepo{}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		OrgID:           orgID,
		CreatedByUserID: uuid.New(),
		AssessmentCycle: "2026-H1",
		Risks:           []RiskInput{{RiskID: approvedID, SourceMode: "latest_approved"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if wpRepo.created == nil {
		t.Fatal("expected working paper to be created")
	}
	if len(wpRepo.created.Risks) != 1 {
		t.Fatalf("expected 1 linked risk, got %d", len(wpRepo.created.Risks))
	}
	if wpRepo.created.Risks[0].RiskID != approvedID {
		t.Fatalf("expected linked approved risk %s, got %s", approvedID, wpRepo.created.Risks[0].RiskID)
	}
	if wpRepo.created.Risks[0].SourceMode != "latest_approved" {
		t.Fatalf("expected latest_approved source mode, got %q", wpRepo.created.Risks[0].SourceMode)
	}
}

func TestCreateLatestApprovedUsesFullAccessibleOrgScope(t *testing.T) {
	accessibleOrgOne := uuid.New()
	accessibleOrgTwo := uuid.New()
	approvedID := uuid.New()
	versionGroupID := uuid.New()

	riskRepo := &fakeCreateRiskRepo{risksByID: map[uuid.UUID]*entity.Risk{
		approvedID: {
			ID:              approvedID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2026-H1",
			Code:            "R-001",
			Title:           "Gangguan server",
			Category:        entity.RiskCategoryOperasional,
			OrganizationID:  &accessibleOrgTwo,
			Probability:     4,
			Impact:          5,
			Weight:          entity.GetBobot(4, 5),
		},
	}}
	wpRepo := &fakeCreateWorkingPaperRepo{}
	monRepo := &fakeCreateMonitoringRepo{}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		CreatedByUserID:  uuid.New(),
		AssessmentCycle:  "2026-H1",
		AccessibleOrgIDs: []uuid.UUID{accessibleOrgOne, accessibleOrgTwo},
		Risks:            []RiskInput{{RiskID: approvedID, SourceMode: "latest_approved"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if len(riskRepo.gotOrgIDs) != 2 {
		t.Fatalf("expected risk lookup to use 2 accessible org IDs, got %d", len(riskRepo.gotOrgIDs))
	}
	if riskRepo.gotOrgIDs[0] != accessibleOrgOne || riskRepo.gotOrgIDs[1] != accessibleOrgTwo {
		t.Fatalf("expected full org scope [%s %s], got %v", accessibleOrgOne, accessibleOrgTwo, riskRepo.gotOrgIDs)
	}
	if wpRepo.created == nil {
		t.Fatal("expected working paper to be created")
	}
	if wpRepo.created.OrgID != accessibleOrgTwo {
		t.Fatalf("expected working paper org %s derived from resolved risk, got %s", accessibleOrgTwo, wpRepo.created.OrgID)
	}
}

func TestCreateReviewPeriodicReusesExistingDraftRiskVersion(t *testing.T) {
	orgID := uuid.New()
	approvedID := uuid.New()
	versionGroupID := uuid.New()
	existingDraftID := uuid.New()

	riskRepo := &fakeCreateRiskRepo{
		risksByID: map[uuid.UUID]*entity.Risk{
			approvedID: {
				ID:              approvedID,
				VersionGroupID:  versionGroupID,
				Status:          entity.RiskStatusApproved,
				IsCurrent:       true,
				AssessmentCycle: "2025-H2",
				Code:            "R-010",
				Title:           "Keterlambatan distribusi",
				Category:        entity.RiskCategoryOperasional,
				Probability:     4,
				Impact:          4,
				Weight:          entity.GetBobot(4, 4),
			},
		},
		versions: []*entity.Risk{{
			ID:              existingDraftID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusDraft,
			AssessmentCycle: "2026-H1",
		}},
	}
	wpRepo := &fakeCreateWorkingPaperRepo{}
	monRepo := &fakeCreateMonitoringRepo{}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		OrgID:           orgID,
		CreatedByUserID: uuid.New(),
		AssessmentCycle: "2026-H1",
		Risks:           []RiskInput{{RiskID: approvedID, SourceMode: "review_periodic"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if wpRepo.created == nil {
		t.Fatal("expected working paper to be created")
	}
	if len(wpRepo.created.Risks) != 1 {
		t.Fatalf("expected 1 linked risk, got %d", len(wpRepo.created.Risks))
	}
	if wpRepo.created.Risks[0].RiskID != existingDraftID {
		t.Fatalf("expected linked draft risk %s, got %s", existingDraftID, wpRepo.created.Risks[0].RiskID)
	}
	if riskRepo.createdRisk != nil {
		t.Fatal("expected existing draft to be reused without creating a new draft")
	}
}

func TestCreateReviewPeriodicCreatesDraftRiskVersionWhenMissing(t *testing.T) {
	orgID := uuid.New()
	approvedID := uuid.New()
	versionGroupID := uuid.New()
	riskRepo := &fakeCreateRiskRepo{risksByID: map[uuid.UUID]*entity.Risk{
		approvedID: {
			ID:              approvedID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2025-H2",
			Code:            "R-011",
			Title:           "Keterlambatan stok",
			Category:        entity.RiskCategoryOperasional,
			Probability:     3,
			Impact:          4,
			Weight:          entity.GetBobot(3, 4),
		},
	}}
	wpRepo := &fakeCreateWorkingPaperRepo{}
	monRepo := &fakeCreateMonitoringRepo{}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		OrgID:           orgID,
		CreatedByUserID: uuid.New(),
		AssessmentCycle: "2026-H1",
		Risks:           []RiskInput{{RiskID: approvedID, SourceMode: "review_periodic"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if riskRepo.createdRisk == nil {
		t.Fatal("expected review_periodic to create a reassessment draft when none exists")
	}
	if wpRepo.created == nil {
		t.Fatal("expected working paper to be created")
	}
	if len(wpRepo.created.Risks) != 1 {
		t.Fatalf("expected 1 linked risk, got %d", len(wpRepo.created.Risks))
	}
	if wpRepo.created.Risks[0].RiskID != riskRepo.createdRisk.ID {
		t.Fatalf("expected linked created draft risk %s, got %s", riskRepo.createdRisk.ID, wpRepo.created.Risks[0].RiskID)
	}
	if wpRepo.created.Risks[0].SourceMode != "review_periodic" {
		t.Fatalf("expected review_periodic source mode, got %q", wpRepo.created.Risks[0].SourceMode)
	}
	if riskRepo.createdRisk.AssessmentCycle != "2026-H1" {
		t.Fatalf("expected created draft cycle 2026-H1, got %q", riskRepo.createdRisk.AssessmentCycle)
	}
}

func TestCreateReviewPeriodicRejectsWhenReviewedVersionAlreadyExists(t *testing.T) {
	approvedID := uuid.New()
	versionGroupID := uuid.New()
	reviewedID := uuid.New()

	riskRepo := &transactionalCreateRiskRepo{fakeCreateRiskRepo: &fakeCreateRiskRepo{
		risksByID: map[uuid.UUID]*entity.Risk{
			approvedID: {
				ID:             approvedID,
				VersionGroupID: versionGroupID,
				Status:         entity.RiskStatusApproved,
				IsCurrent:      true,
				Code:           "R-021",
				Title:          "Distribusi tersendat",
				Category:       entity.RiskCategoryOperasional,
			},
		},
	},
		reservedRisk: &entity.Risk{
			ID:              reviewedID,
			VersionGroupID:  versionGroupID,
			Status:          "reviewed",
			AssessmentCycle: "2026-H1",
		},
	}
	wpRepo := &fakeCreateWorkingPaperRepo{}
	monRepo := &fakeCreateMonitoringRepo{}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		CreatedByUserID:  uuid.New(),
		AssessmentCycle:  "2026-H1",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		Risks:            []RiskInput{{RiskID: approvedID, SourceMode: "review_periodic"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err == nil {
		t.Fatal("expected error when reviewed reassessment exists")
	}
	if riskRepo.reserveCalls != 1 {
		t.Fatalf("expected repository-managed reassessment reservation once, got %d", riskRepo.reserveCalls)
	}
	if riskRepo.createdRisk != nil {
		t.Fatal("expected no new draft when reviewed in-progress version exists")
	}
	if wpRepo.created != nil {
		t.Fatal("expected working paper not to be created")
	}
}

func TestCreateReviewPeriodicCreatesQuarterlyMonitoring(t *testing.T) {
	orgID := uuid.New()
	approvedID := uuid.New()
	versionGroupID := uuid.New()

	riskRepo := &fakeCreateRiskRepo{risksByID: map[uuid.UUID]*entity.Risk{
		approvedID: {
			ID:              approvedID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2025-H2",
			Code:            "R-012",
			Title:           "Test risiko",
			Category:        entity.RiskCategoryOperasional,
			Probability:     3,
			Impact:          4,
			Weight:          entity.GetBobot(3, 4),
		},
	}}
	wpRepo := &fakeCreateWorkingPaperRepo{}
	monRepo := &fakeCreateMonitoringRepo{}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		OrgID:           orgID,
		CreatedByUserID: uuid.New(),
		AssessmentCycle: "2026-H1",
		Risks:           []RiskInput{{RiskID: approvedID, SourceMode: "review_periodic"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if len(monRepo.createdMonitorings) != 1 {
		t.Fatalf("expected 1 quarterly monitoring created, got %d", len(monRepo.createdMonitorings))
	}
	if monRepo.createdMonitorings[0].AssessmentCycle != "2026-Q2" {
		t.Fatalf("expected Q2 monitoring cycle, got %q", monRepo.createdMonitorings[0].AssessmentCycle)
	}
	if monRepo.createdMonitorings[0].SourceRiskID != approvedID {
		t.Fatalf("expected monitoring source risk %s, got %s", approvedID, monRepo.createdMonitorings[0].SourceRiskID)
	}
}

func TestCreateReviewPeriodicRejectsWhenQuarterlyMonitoringAlreadyExists(t *testing.T) {
	orgID := uuid.New()
	approvedID := uuid.New()
	versionGroupID := uuid.New()

	riskRepo := &fakeCreateRiskRepo{risksByID: map[uuid.UUID]*entity.Risk{
		approvedID: {
			ID:              approvedID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2025-H2",
			Code:            "R-013",
			Title:           "Test risiko",
			Category:        entity.RiskCategoryOperasional,
			Probability:     3,
			Impact:          4,
			Weight:          entity.GetBobot(3, 4),
		},
	}}
	wpRepo := &fakeCreateWorkingPaperRepo{}
	monRepo := &fakeCreateMonitoringRepo{
		draftBySourceAndCycle: &entity.RiskMonitoring{
			ID:              uuid.New(),
			SourceRiskID:    approvedID,
			AssessmentCycle: "2026-Q2",
			Status:          entity.RiskMonitoringStatusDraft,
		},
	}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		OrgID:           orgID,
		CreatedByUserID: uuid.New(),
		AssessmentCycle: "2026-H1",
		Risks:           []RiskInput{{RiskID: approvedID, SourceMode: "review_periodic"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err == nil {
		t.Fatal("expected error when Q2 monitoring already exists")
	}
	var appErr *domainerrors.AppError
	ok := false
	if err != nil {
		appErr, ok = err.(*domainerrors.AppError)
	}
	if !ok || appErr.Code != "MONITORING_CONFLICT" {
		t.Fatalf("expected MONITORING_CONFLICT error, got %v", err)
	}
}

func TestCreateRejectsDuplicateWorkingPaperForSameSemester(t *testing.T) {
	orgID := uuid.New()
	approvedID := uuid.New()
	versionGroupID := uuid.New()

	riskRepo := &fakeCreateRiskRepo{risksByID: map[uuid.UUID]*entity.Risk{
		approvedID: {
			ID:              approvedID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2026-H1",
			Code:            "R-014",
			Title:           "Test risiko",
			Category:        entity.RiskCategoryOperasional,
			Probability:     3,
			Impact:          4,
			Weight:          entity.GetBobot(3, 4),
		},
	}}
	wpRepo := &fakeCreateWorkingPaperRepo{
		countByOrgAndCycleFn: func(orgID uuid.UUID, cycle string) int {
			return 1
		},
	}
	monRepo := &fakeCreateMonitoringRepo{}
	uc := NewWorkingPaperUseCase(wpRepo, riskRepo, monRepo)

	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		OrgID:           orgID,
		CreatedByUserID: uuid.New(),
		AssessmentCycle: "2026-H1",
		Risks:           []RiskInput{{RiskID: approvedID, SourceMode: "latest_approved"}},
		Signatories: []CreateSignatoryInput{{
			UserID:        uuid.New(),
			SequenceNo:    1,
			SignerName:    "Rina",
			SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err == nil {
		t.Fatal("expected error for duplicate working paper in same semester")
	}
	var appErr *domainerrors.AppError
	ok := false
	if err != nil {
		appErr, ok = err.(*domainerrors.AppError)
	}
	if !ok || appErr.Code != "SEMESTER_CONFLICT" {
		t.Fatalf("expected SEMESTER_CONFLICT error, got %v", err)
	}
}

func cloneCreateRisk(risk *entity.Risk) *entity.Risk {
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
