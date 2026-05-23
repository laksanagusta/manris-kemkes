package http

import (
	"bytes"
	"context"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

type mitigationTaskRepoStub struct {
	task            *entity.MitigationTask
	lastAllOrgIDs   []uuid.UUID
	lastByRiskOrgIDs []uuid.UUID
	lastGetOrgIDs   []uuid.UUID
}

func (r *mitigationTaskRepoStub) Create(context.Context, *entity.MitigationTask) error { return nil }

func (r *mitigationTaskRepoStub) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MitigationTask, error) {
	r.lastGetOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	if r.task == nil || r.task.ID != id {
		return nil, nil
	}
	clone := *r.task
	return &clone, nil
}

func (r *mitigationTaskRepoStub) Update(context.Context, *entity.MitigationTask) error { return nil }

func (r *mitigationTaskRepoStub) ListByRisk(_ context.Context, _ uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	r.lastByRiskOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.MitigationTask{}, nil
}

func (r *mitigationTaskRepoStub) ListByMitigation(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return []*entity.MitigationTask{}, nil
}

func (r *mitigationTaskRepoStub) ListByUser(context.Context, uuid.UUID, string, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return []*entity.MitigationTask{}, nil
}

func (r *mitigationTaskRepoStub) ListPendingOverdue(context.Context, time.Time) ([]*entity.MitigationTask, error) {
	return []*entity.MitigationTask{}, nil
}

func (r *mitigationTaskRepoStub) GetRecurringMitigations(context.Context) ([]*entity.Mitigation, error) {
	return []*entity.Mitigation{}, nil
}

func (r *mitigationTaskRepoStub) ListAll(_ context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	r.lastAllOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.MitigationTask{}, nil
}

func (r *mitigationTaskRepoStub) ListAllPaginated(_ context.Context, orgIDs []uuid.UUID, _, _ int) ([]*entity.MitigationTask, int, error) {
	r.lastAllOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.MitigationTask{}, 0, nil
}

func (r *mitigationTaskRepoStub) TaskExistsForPeriod(context.Context, uuid.UUID, string, string) (bool, error) {
	return false, nil
}

var _ repository.MitigationTaskRepository = (*mitigationTaskRepoStub)(nil)

type mitigationRiskRepoStub struct {
	risk          *entity.Risk
	lastOrgIDs    []uuid.UUID
}

func (r *mitigationRiskRepoStub) Create(context.Context, *entity.Risk) error { return nil }

func (r *mitigationRiskRepoStub) GetByID(_ context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	r.lastOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	if r.risk == nil || r.risk.ID != id {
		return nil, nil
	}
	clone := *r.risk
	return &clone, nil
}

func (r *mitigationRiskRepoStub) Update(context.Context, *entity.Risk) error { return nil }
func (r *mitigationRiskRepoStub) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *mitigationRiskRepoStub) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return []*entity.Risk{}, nil
}
func (r *mitigationRiskRepoStub) ListRegister(context.Context, repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return []*entity.Risk{}, 0, nil
}
func (r *mitigationRiskRepoStub) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return []*entity.MitigationAssoc{}, nil
}
func (r *mitigationRiskRepoStub) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *mitigationRiskRepoStub) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return []*entity.Risk{}, nil
}
func (r *mitigationRiskRepoStub) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *mitigationRiskRepoStub) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return []*entity.DashboardCategoryCount{}, nil
}
func (r *mitigationRiskRepoStub) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return []*entity.HeatmapCell{}, nil
}
func (r *mitigationRiskRepoStub) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (r *mitigationRiskRepoStub) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return []*entity.Risk{}, nil
}
func (r *mitigationRiskRepoStub) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return []*entity.Risk{}, nil
}
func (r *mitigationRiskRepoStub) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return []*entity.Risk{}, nil
}
func (r *mitigationRiskRepoStub) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *mitigationRiskRepoStub) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return []*entity.RiskReviewQueueItem{}, 0, nil
}
func (r *mitigationRiskRepoStub) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return []*entity.RiskCycleComparisonItem{}, nil
}
func (r *mitigationRiskRepoStub) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *mitigationRiskRepoStub) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return []entity.HeatmapVelocityCell{}, nil
}
func (r *mitigationRiskRepoStub) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return []entity.OverdueMitigationTimelineItem{}, nil
}
func (r *mitigationRiskRepoStub) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return []entity.KRIBreachItem{}, nil
}
func (r *mitigationRiskRepoStub) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return []entity.UnitResponseTime{}, nil
}

var _ repository.RiskRepository = (*mitigationRiskRepoStub)(nil)

func TestListAllMitigationTasksUsesOwnOrgOnlyScope(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	taskRepo := &mitigationTaskRepoStub{}
	riskRepo := &mitigationRiskRepoStub{}
	handler := &MitigationTaskHandler{
		listUC: mtuc.NewListTasksUseCase(taskRepo, riskRepo),
	}

	app := fiber.New()
	app.Get("/mitigation-tasks/all", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleReviewer,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.ListAll)

	req := httptest.NewRequest(fiber.MethodGet, "/mitigation-tasks/all?page=1&limit=10", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(taskRepo.lastAllOrgIDs) != 1 || taskRepo.lastAllOrgIDs[0] != own {
		t.Fatalf("expected own-org-only scope [%s], got %v", own, taskRepo.lastAllOrgIDs)
	}
}

func TestSubmitProgressUsesOwnOrgOnlyScope(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	riskID := uuid.New()
	taskID := uuid.New()
	taskRepo := &mitigationTaskRepoStub{
		task: &entity.MitigationTask{
			ID:        taskID,
			RiskID:    riskID,
			DueDate:   "2026-06-10",
			PeriodEnd: "2026-06-10",
		},
	}
	riskRepo := &mitigationRiskRepoStub{
		risk: &entity.Risk{ID: riskID},
	}
	handler := &MitigationTaskHandler{
		submitProgressUC: mtuc.NewSubmitProgressUseCase(taskRepo, riskRepo),
	}

	app := fiber.New()
	app.Post("/mitigation-tasks/:id/submit", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleUnit,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		c.Locals("userId", uuid.New())
		return c.Next()
	}, handler.SubmitProgress)

	body := []byte(`{"progressPct":50,"evidenceUrl":"https://example.com/evidence","notes":"progress updated"}`)
	req := httptest.NewRequest(
		fiber.MethodPost,
		"/mitigation-tasks/"+taskID.String()+"/submit",
		bytes.NewReader(body),
	)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(taskRepo.lastGetOrgIDs) != 1 || taskRepo.lastGetOrgIDs[0] != own {
		t.Fatalf("expected own-org-only task lookup [%s], got %v", own, taskRepo.lastGetOrgIDs)
	}
	if len(riskRepo.lastOrgIDs) != 1 || riskRepo.lastOrgIDs[0] != own {
		t.Fatalf("expected own-org-only risk lookup [%s], got %v", own, riskRepo.lastOrgIDs)
	}
}
