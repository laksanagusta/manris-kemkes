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

func (r *fakeCreateWorkingPaperRepo) PreviewPeriodRoster(context.Context, uuid.UUID, string) (*entity.WorkingPaperRosterPreview, error) {
	return nil, nil
}
func (r *fakeCreateWorkingPaperRepo) CreateWithPeriodRoster(context.Context, *entity.WorkingPaper, string, []entity.WorkingPaperRosterDecision) error {
	return nil
}
func (r *fakeCreateWorkingPaperRepo) ListSigningBlockers(context.Context, uuid.UUID) ([]entity.WorkingPaperSigningBlocker, error) {
	return nil, nil
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

func (r *fakeCreateMonitoringRepo) UpdateTaskMonitoringIDs(context.Context, uuid.UUID, uuid.UUID, string) error {
	return nil
}

func TestCreateRejectsExcludedRiskWithoutReason(t *testing.T) {
	uc := NewWorkingPaperUseCase(&fakeCreateWorkingPaperRepo{}, nil, nil)
	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		AssessmentCycle: "2026-H1",
		OrganizationID:  uuid.New(),
		CreatedByUserID: uuid.New(),
		Decisions: []entity.WorkingPaperRosterDecision{
			{VersionGroupID: uuid.New(), Included: false, ExclusionReason: ""},
		},
		Signatories: []CreateSignatoryInput{{
			UserID: uuid.New(), SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err == nil {
		t.Fatal("expected error for exclusion without reason")
	}
}

func TestCreateRejectsEmptyIncludedRoster(t *testing.T) {
	uc := NewWorkingPaperUseCase(&fakeCreateWorkingPaperRepo{}, nil, nil)
	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		AssessmentCycle: "2026-H1",
		OrganizationID:  uuid.New(),
		CreatedByUserID: uuid.New(),
		Decisions: []entity.WorkingPaperRosterDecision{
			{VersionGroupID: uuid.New(), Included: false, ExclusionReason: "Risiko ditutup"},
		},
		Signatories: []CreateSignatoryInput{{
			UserID: uuid.New(), SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err == nil {
		t.Fatal("expected error for empty included roster")
	}
}

func TestCreateRejectsEmptyDecisions(t *testing.T) {
	uc := NewWorkingPaperUseCase(&fakeCreateWorkingPaperRepo{}, nil, nil)
	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		AssessmentCycle: "2026-H1",
		OrganizationID:  uuid.New(),
		CreatedByUserID: uuid.New(),
		Decisions:       []entity.WorkingPaperRosterDecision{},
		Signatories: []CreateSignatoryInput{{
			UserID: uuid.New(), SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err == nil {
		t.Fatal("expected error for empty decisions")
	}
}

func TestCreateRejectsMissingSignatories(t *testing.T) {
	uc := NewWorkingPaperUseCase(&fakeCreateWorkingPaperRepo{}, nil, nil)
	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		AssessmentCycle: "2026-H1",
		OrganizationID:  uuid.New(),
		CreatedByUserID: uuid.New(),
		Decisions: []entity.WorkingPaperRosterDecision{
			{VersionGroupID: uuid.New(), Included: true},
		},
		Signatories: []CreateSignatoryInput{},
	})
	if err == nil {
		t.Fatal("expected error for missing signatories")
	}
}

func TestCreateRejectsInvalidSemesterFormat(t *testing.T) {
	uc := NewWorkingPaperUseCase(&fakeCreateWorkingPaperRepo{}, nil, nil)
	_, err := uc.Create(context.Background(), CreateWorkingPaperInput{
		AssessmentCycle: "invalid",
		OrganizationID:  uuid.New(),
		CreatedByUserID: uuid.New(),
		Decisions: []entity.WorkingPaperRosterDecision{
			{VersionGroupID: uuid.New(), Included: true},
		},
		Signatories: []CreateSignatoryInput{{
			UserID: uuid.New(), SequenceNo: 1, SignerName: "Rina", SignerPangkat: "Pembina Tk. I (IV/b)",
		}},
	})
	if err == nil {
		t.Fatal("expected error for invalid semester")
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
