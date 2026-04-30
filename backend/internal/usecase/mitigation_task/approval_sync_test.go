package mitigation_task

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeApprovalSyncRiskRepo struct {
	risk *entity.Risk
}

func (r *fakeApprovalSyncRiskRepo) Create(context.Context, *entity.Risk) error { return nil }
func (r *fakeApprovalSyncRiskRepo) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if r.risk == nil || r.risk.ID != id {
		return nil, domainerrors.ErrRiskNotFound
	}
	clone := *r.risk
	clone.Mitigations = append([]entity.Mitigation(nil), r.risk.Mitigations...)
	return &clone, nil
}
func (r *fakeApprovalSyncRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *fakeApprovalSyncRiskRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *fakeApprovalSyncRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) ListRegister(context.Context, repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (r *fakeApprovalSyncRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *fakeApprovalSyncRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *fakeApprovalSyncRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (r *fakeApprovalSyncRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *fakeApprovalSyncRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type fakeApprovalSyncTaskRepo struct {
	created []*entity.MitigationTask
	exists  map[string]bool
}

func (r *fakeApprovalSyncTaskRepo) Create(_ context.Context, task *entity.MitigationTask) error {
	clone := *task
	clone.ID = uuid.New()
	clone.CreatedAt = time.Now().UTC()
	clone.UpdatedAt = clone.CreatedAt
	r.created = append(r.created, &clone)
	return nil
}
func (r *fakeApprovalSyncTaskRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.MitigationTask, error) {
	return nil, nil
}
func (r *fakeApprovalSyncTaskRepo) Update(context.Context, *entity.MitigationTask) error { return nil }
func (r *fakeApprovalSyncTaskRepo) ListByRisk(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *fakeApprovalSyncTaskRepo) ListByMitigation(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *fakeApprovalSyncTaskRepo) ListByUser(context.Context, uuid.UUID, string, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *fakeApprovalSyncTaskRepo) ListPendingOverdue(context.Context, time.Time) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *fakeApprovalSyncTaskRepo) GetRecurringMitigations(context.Context) ([]*entity.Mitigation, error) {
	return nil, nil
}
func (r *fakeApprovalSyncTaskRepo) ListAll(context.Context, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *fakeApprovalSyncTaskRepo) ListAllPaginated(context.Context, []uuid.UUID, int, int) ([]*entity.MitigationTask, int, error) {
	return nil, 0, nil
}
func (r *fakeApprovalSyncTaskRepo) TaskExistsForPeriod(_ context.Context, mitigationID uuid.UUID, periodStart, periodEnd string) (bool, error) {
	if r.exists == nil {
		return false, nil
	}
	return r.exists[mitigationID.String()+":"+periodStart+":"+periodEnd], nil
}

func TestEnsureTasksForApprovedRiskUseCase_ExecuteCreatesOneTaskPerMitigation(t *testing.T) {
	riskID := uuid.New()
	firstMitigationID := uuid.New()
	secondMitigationID := uuid.New()
	firstDueDate := "2026-06-10"
	secondDueDate := "2026-06-20"

	riskRepo := &fakeApprovalSyncRiskRepo{
		risk: &entity.Risk{
			ID:              riskID,
			Status:          entity.RiskStatusApproved,
			AssessmentCycle: "2026-H1",
			Mitigations: []entity.Mitigation{
				{ID: firstMitigationID, RiskID: riskID, Action: "A", Owner: "PIC A", DueDate: &firstDueDate},
				{ID: secondMitigationID, RiskID: riskID, Action: "B", Owner: "PIC B", DueDate: &secondDueDate},
			},
		},
	}
	taskRepo := &fakeApprovalSyncTaskRepo{}
	uc := NewEnsureTasksForApprovedRiskUseCase(taskRepo, riskRepo)

	created, err := uc.Execute(context.Background(), riskID, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if created != 2 {
		t.Fatalf("expected 2 created tasks, got %d", created)
	}
	if len(taskRepo.created) != 2 {
		t.Fatalf("expected 2 persisted tasks, got %d", len(taskRepo.created))
	}
	if taskRepo.created[0].DueDate != firstDueDate || taskRepo.created[0].PeriodStart != firstDueDate || taskRepo.created[0].PeriodEnd != firstDueDate {
		t.Fatalf("expected first task due/period to use mitigation due date, got %+v", taskRepo.created[0])
	}
	if taskRepo.created[0].PeriodLabel != "2026-H1" {
		t.Fatalf("expected period label to follow assessment cycle, got %q", taskRepo.created[0].PeriodLabel)
	}
}

func TestEnsureTasksForApprovedRiskUseCase_ExecuteSkipsExistingTask(t *testing.T) {
	riskID := uuid.New()
	mitigationID := uuid.New()
	dueDate := "2026-06-10"

	riskRepo := &fakeApprovalSyncRiskRepo{
		risk: &entity.Risk{
			ID:     riskID,
			Status: entity.RiskStatusApproved,
			Mitigations: []entity.Mitigation{
				{ID: mitigationID, RiskID: riskID, Action: "A", Owner: "PIC A", DueDate: &dueDate},
			},
		},
	}
	taskRepo := &fakeApprovalSyncTaskRepo{
		exists: map[string]bool{
			mitigationID.String() + ":" + dueDate + ":" + dueDate: true,
		},
	}
	uc := NewEnsureTasksForApprovedRiskUseCase(taskRepo, riskRepo)

	created, err := uc.Execute(context.Background(), riskID, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if created != 0 {
		t.Fatalf("expected 0 created tasks, got %d", created)
	}
	if len(taskRepo.created) != 0 {
		t.Fatalf("expected no persisted tasks, got %d", len(taskRepo.created))
	}
}
