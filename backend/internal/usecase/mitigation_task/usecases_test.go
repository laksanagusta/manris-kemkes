package mitigation_task

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

type fakeGenerateTaskRepo struct {
	recurring []*entity.Mitigation
	created   []*entity.MitigationTask
}

func (r *fakeGenerateTaskRepo) Create(_ context.Context, task *entity.MitigationTask) error {
	clone := *task
	clone.ID = uuid.New()
	clone.CreatedAt = time.Now().UTC()
	clone.UpdatedAt = clone.CreatedAt
	r.created = append(r.created, &clone)
	return nil
}

func (r *fakeGenerateTaskRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.MitigationTask, error) {
	return nil, nil
}

func (r *fakeGenerateTaskRepo) Update(context.Context, *entity.MitigationTask) error { return nil }

func (r *fakeGenerateTaskRepo) ListByRisk(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}

func (r *fakeGenerateTaskRepo) ListByMitigation(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}

func (r *fakeGenerateTaskRepo) ListByUser(context.Context, uuid.UUID, string, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}

func (r *fakeGenerateTaskRepo) ListPendingOverdue(context.Context, time.Time) ([]*entity.MitigationTask, error) {
	return nil, nil
}

func (r *fakeGenerateTaskRepo) GetRecurringMitigations(context.Context) ([]*entity.Mitigation, error) {
	return r.recurring, nil
}

func (r *fakeGenerateTaskRepo) ListAll(context.Context, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}

func (r *fakeGenerateTaskRepo) ListAllPaginated(context.Context, []uuid.UUID, string, int, int) ([]*entity.MitigationTask, int, error) {
	return nil, 0, nil
}

func (r *fakeGenerateTaskRepo) TaskExistsForPeriod(context.Context, uuid.UUID, string, string) (bool, error) {
	return false, nil
}

func (r *fakeGenerateTaskRepo) ListByMonitoring(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}

func (r *fakeGenerateTaskRepo) CountByMonitoringAndStatus(context.Context, uuid.UUID, []uuid.UUID) (*repo.MonitoringTaskCounts, error) {
	return &repo.MonitoringTaskCounts{}, nil
}

type fakeSubmitMitigationTaskRepo struct {
	task    *entity.MitigationTask
	updated *entity.MitigationTask
}

func (r *fakeSubmitMitigationTaskRepo) Create(context.Context, *entity.MitigationTask) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.MitigationTask, error) {
	if r.task == nil {
		return nil, errors.New("not found")
	}
	clone := *r.task
	return &clone, nil
}
func (r *fakeSubmitMitigationTaskRepo) Update(_ context.Context, task *entity.MitigationTask) error {
	clone := *task
	r.updated = &clone
	r.task = &clone
	return nil
}
func (r *fakeSubmitMitigationTaskRepo) ListByRisk(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) ListByMitigation(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) ListByUser(context.Context, uuid.UUID, string, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) ListPendingOverdue(context.Context, time.Time) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) GetRecurringMitigations(context.Context) ([]*entity.Mitigation, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) ListAll(context.Context, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) ListAllPaginated(context.Context, []uuid.UUID, string, int, int) ([]*entity.MitigationTask, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeSubmitMitigationTaskRepo) TaskExistsForPeriod(context.Context, uuid.UUID, string, string) (bool, error) {
	return false, nil
}

func (r *fakeSubmitMitigationTaskRepo) ListByMonitoring(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeSubmitMitigationTaskRepo) CountByMonitoringAndStatus(context.Context, uuid.UUID, []uuid.UUID) (*repo.MonitoringTaskCounts, error) {
	return nil, errors.New("not implemented")
}

var _ repo.MitigationTaskRepository = (*fakeSubmitMitigationTaskRepo)(nil)

type fakeSubmitRiskRepo struct {
	risk *entity.Risk
}

func (r *fakeSubmitRiskRepo) Create(context.Context, *entity.Risk) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if r.risk == nil {
		return nil, domainerrors.ErrRiskNotFound
	}
	clone := *r.risk
	return &clone, nil
}
func (r *fakeSubmitRiskRepo) Update(context.Context, *entity.Risk) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeSubmitRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, errors.New("not implemented")
}

var _ repo.RiskRepository = (*fakeSubmitRiskRepo)(nil)

func TestGenerateTasksUseCase_ExecuteUsesAssessmentCycleAsPeriodLabel(t *testing.T) {
	mitigationID := uuid.New()
	riskID := uuid.New()
	taskRepo := &fakeGenerateTaskRepo{
		recurring: []*entity.Mitigation{
			{
				ID:                mitigationID,
				RiskID:            riskID,
				AssessmentCycle:   "2026-H1",
				RecurringInterval: ptrString("mingguan"),
				Owner:             "PIC",
				Action:            "Tindak lanjut",
			},
		},
	}

	uc := NewGenerateTasksUseCase(taskRepo)

	created, err := uc.Execute(context.Background(), time.Date(2026, time.April, 15, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if created != 1 {
		t.Fatalf("expected 1 created task, got %d", created)
	}
	if len(taskRepo.created) != 1 {
		t.Fatalf("expected 1 persisted task, got %d", len(taskRepo.created))
	}
	if taskRepo.created[0].PeriodLabel != "2026-H1" {
		t.Fatalf("expected period label to follow assessment cycle, got %q", taskRepo.created[0].PeriodLabel)
	}
}

func TestGenerateTasksUseCase_ExecuteSkipsExistingControls(t *testing.T) {
	mitigationID := uuid.New()
	riskID := uuid.New()
	taskRepo := &fakeGenerateTaskRepo{
		recurring: []*entity.Mitigation{
			{
				ID:                mitigationID,
				RiskID:            riskID,
				AssessmentCycle:   "2026-H1",
				RecurringInterval: ptrString("mingguan"),
				Owner:             "PIC",
				Action:            "Kontrol lama",
				IsExistingControl: true,
				DueDate:           ptrString("2026-06-10"),
			},
		},
	}

	uc := NewGenerateTasksUseCase(taskRepo)

	created, err := uc.Execute(context.Background(), time.Date(2026, time.April, 15, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if created != 0 {
		t.Fatalf("expected 0 created task, got %d", created)
	}
	if len(taskRepo.created) != 0 {
		t.Fatalf("expected no persisted tasks, got %d", len(taskRepo.created))
	}
}

func TestSubmitProgressUseCase_ExecuteAllowsOverdueSubmission(t *testing.T) {
	taskID := uuid.New()
	riskID := uuid.New()
	taskRepo := &fakeSubmitMitigationTaskRepo{
		task: &entity.MitigationTask{
			ID:        taskID,
			RiskID:    riskID,
			PeriodEnd: "2000-01-01",
			DueDate:   "2000-01-02",
			Status:    "overdue",
		},
	}
	riskRepo := &fakeSubmitRiskRepo{
		risk: &entity.Risk{ID: riskID},
	}

	uc := NewSubmitProgressUseCase(taskRepo, riskRepo)
	got, err := uc.Execute(context.Background(), SubmitProgressInput{
		TaskID:      taskID,
		EvidenceURL: "https://example.com/evidence",
		Notes:       "Catatan valid untuk progress",
		ReportedBy:  uuid.New(),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got == nil {
		t.Fatalf("expected updated task, got nil")
	}
	if got.Status != "done" {
		t.Fatalf("expected task to be marked done, got %q", got.Status)
	}
	if taskRepo.updated == nil {
		t.Fatalf("expected task update to be persisted")
	}
	if taskRepo.updated.Status != "done" {
		t.Fatalf("expected stored task to be done, got %q", taskRepo.updated.Status)
	}
}

func TestSubmitProgressUseCase_ExecuteAllowsEarlySubmission(t *testing.T) {
	taskID := uuid.New()
	riskID := uuid.New()
	taskRepo := &fakeSubmitMitigationTaskRepo{
		task: &entity.MitigationTask{
			ID:        taskID,
			RiskID:    riskID,
			PeriodEnd: "2999-01-01",
			DueDate:   "2999-01-02",
			Status:    "pending",
		},
	}
	riskRepo := &fakeSubmitRiskRepo{
		risk: &entity.Risk{ID: riskID},
	}

	uc := NewSubmitProgressUseCase(taskRepo, riskRepo)
	got, err := uc.Execute(context.Background(), SubmitProgressInput{
		TaskID:      taskID,
		EvidenceURL: "https://example.com/evidence",
		Notes:       "Catatan valid untuk progress",
		ReportedBy:  uuid.New(),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got == nil {
		t.Fatal("expected updated task, got nil")
	}
	if got.Status != "done" {
		t.Fatalf("expected task to be marked done, got %q", got.Status)
	}
	if taskRepo.updated == nil {
		t.Fatal("expected persisted update for early submission")
	}
}

func ptrString(value string) *string { return &value }
