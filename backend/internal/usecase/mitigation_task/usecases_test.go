package mitigation_task

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
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

func (r *fakeGenerateTaskRepo) ListAllPaginated(context.Context, []uuid.UUID, int, int) ([]*entity.MitigationTask, int, error) {
	return nil, 0, nil
}

func (r *fakeGenerateTaskRepo) TaskExistsForPeriod(context.Context, uuid.UUID, string, string) (bool, error) {
	return false, nil
}

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

func ptrString(value string) *string { return &value }
