package risk

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakeDashboardRiskRepo struct {
	list              func(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error)
	listCycleSnapshot func(context.Context, string, []uuid.UUID) ([]*entity.Risk, error)
	compareCycles     func(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error)
}

func (r *fakeDashboardRiskRepo) List(ctx context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error) {
	if r.list != nil {
		return r.list(ctx, orgIDs, status, category)
	}
	return nil, errors.New("not implemented")
}

func (r *fakeDashboardRiskRepo) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	if r.listCycleSnapshot != nil {
		return r.listCycleSnapshot(ctx, cycle, orgIDs)
	}
	return nil, errors.New("not implemented")
}

func (r *fakeDashboardRiskRepo) CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	if r.compareCycles != nil {
		return r.compareCycles(ctx, fromCycle, toCycle, orgIDs)
	}
	return nil, errors.New("not implemented")
}

type fakeDashboardIncidentRepo struct {
	list func(context.Context, []uuid.UUID) ([]*entity.Incident, error)
}

func (r *fakeDashboardIncidentRepo) List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
	if r.list != nil {
		return r.list(ctx, orgIDs)
	}
	return nil, errors.New("not implemented")
}

type fakeDashboardTaskRepo struct {
	listAll func(context.Context, []uuid.UUID) ([]*entity.MitigationTask, error)
}

func (r *fakeDashboardTaskRepo) ListAll(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	if r.listAll != nil {
		return r.listAll(ctx, orgIDs)
	}
	return nil, errors.New("not implemented")
}

func TestDashboardActionPressureUseCase_ExecuteBuildsMonthlySeries(t *testing.T) {
	now := time.Date(2026, time.April, 2, 0, 0, 0, 0, time.UTC)
	repo := &fakeDashboardIncidentRepo{
		list: func(_ context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
			if len(orgIDs) != 0 {
				t.Fatalf("expected no org filters, got %d", len(orgIDs))
			}
			feb := time.Date(2026, time.February, 10, 0, 0, 0, 0, time.UTC)
			mar := time.Date(2026, time.March, 15, 0, 0, 0, 0, time.UTC)
			return []*entity.Incident{{CreatedAt: feb}, {CreatedAt: mar}, {CreatedAt: mar}}, nil
		},
	}
	taskRepo := &fakeDashboardTaskRepo{
		listAll: func(_ context.Context, _ []uuid.UUID) ([]*entity.MitigationTask, error) {
			reportedAt := time.Date(2026, time.March, 20, 0, 0, 0, 0, time.UTC)
			return []*entity.MitigationTask{
				{Status: "done", ReportedAt: &reportedAt, DueDate: "2026-03-10"},
				{Status: "pending", DueDate: "2026-02-12"},
				{Status: "overdue", DueDate: "2026-01-08"},
			}, nil
		},
	}

	uc := NewDashboardActionPressureUseCase(repo, taskRepo)
	uc.now = func() time.Time { return now }

	points, err := uc.Execute(context.Background(), DashboardActionPressureInput{Interval: "month", Window: 4})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(points) != 4 {
		t.Fatalf("expected 4 points, got %d", len(points))
	}

	if points[0].Period != "2026-01" || points[0].OverdueMitigations != 1 {
		t.Fatalf("expected Jan overdue count 1, got %#v", points[0])
	}
	if points[1].Period != "2026-02" || points[1].IncidentsCreated != 1 || points[1].OverdueMitigations != 1 {
		t.Fatalf("expected Feb incidents 1 and overdue 1, got %#v", points[1])
	}
	if points[2].Period != "2026-03" || points[2].IncidentsCreated != 2 || points[2].MitigationsCompleted != 1 {
		t.Fatalf("expected Mar incidents 2 and completed 1, got %#v", points[2])
	}
	if points[3].Period != "2026-04" {
		t.Fatalf("expected Apr point, got %#v", points[3])
	}
}

func TestExecutiveAlertsUseCase_ExecuteBuildsRankedAlerts(t *testing.T) {
	now := time.Date(2026, time.April, 2, 0, 0, 0, 0, time.UTC)
	riskExtremeID := uuid.New()
	riskUpID := uuid.New()
	riskOverdueID := uuid.New()
	riskRepo := &fakeDashboardRiskRepo{
		list: func(_ context.Context, _ []uuid.UUID, status string, category string) ([]*entity.Risk, error) {
			if status != "approved" {
				t.Fatalf("expected status approved, got %q", status)
			}
			if category != "" {
				t.Fatalf("expected empty category filter, got %q", category)
			}
			return []*entity.Risk{
				{ID: riskExtremeID, Code: "R-001", Title: "Lonjakan kasus", OrgName: "Direktorat A"},
				{ID: riskUpID, Code: "R-002", Title: "Keterlambatan inspeksi", OrgName: "Direktorat A"},
				{ID: riskOverdueID, Code: "R-003", Title: "Keterlambatan distribusi", OrgName: "Direktorat C"},
			}, nil
		},
		listCycleSnapshot: func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
			switch cycle {
			case "2026-H1":
				return []*entity.Risk{
					{ID: riskExtremeID, Code: "R-001", Title: "Lonjakan kasus", Probability: 5, Impact: 4, OrgName: "Direktorat A"},
					{ID: riskUpID, Code: "R-002", Title: "Keterlambatan inspeksi", Probability: 4, Impact: 3, OrgName: "Direktorat A"},
				}, nil
			case "2025-H2":
				return []*entity.Risk{
					{Code: "R-002", Title: "Keterlambatan inspeksi", OrgName: "Direktorat A"},
					{Code: "R-100", Title: "Dokumentasi belum lengkap", OrgName: "Direktorat B"},
				}, nil
			default:
				return []*entity.Risk{}, nil
			}
		},
		compareCycles: func(_ context.Context, fromCycle string, toCycle string, _ []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
			if fromCycle != "2025-H2" || toCycle != "2026-H1" {
				t.Fatalf("unexpected cycle comparison %s -> %s", fromCycle, toCycle)
			}
			return []*entity.RiskCycleComparisonItem{{
				Code:          "R-002",
				Title:         "Keterlambatan inspeksi",
				OrgName:       "Direktorat A",
				PreviousLevel: "sedang",
				CurrentLevel:  "tinggi",
				Movement:      "up",
			}}, nil
		},
	}
	taskRepo := &fakeDashboardTaskRepo{
		listAll: func(_ context.Context, _ []uuid.UUID) ([]*entity.MitigationTask, error) {
			return []*entity.MitigationTask{{
				RiskID:           riskOverdueID,
				RiskCode:         "R-003",
				RiskTitle:        "Keterlambatan distribusi",
				MitigationAction: "Percepat pengadaan vendor cadangan",
				Status:           "pending",
				DueDate:          "2026-02-15",
			}}, nil
		},
	}

	uc := NewExecutiveAlertsUseCase(riskRepo, taskRepo)
	uc.now = func() time.Time { return now }

	alerts, err := uc.Execute(context.Background(), ExecutiveAlertsInput{Cycle: "2026-H1", Limit: 10})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(alerts) != 4 {
		t.Fatalf("expected 4 alerts, got %d", len(alerts))
	}
	if alerts[0].Category != "new_extreme" {
		t.Fatalf("expected first alert new_extreme, got %#v", alerts[0])
	}
	if alerts[1].Category != "risk_up" {
		t.Fatalf("expected second alert risk_up, got %#v", alerts[1])
	}
	if alerts[2].Category != "mitigation_overdue" {
		t.Fatalf("expected third alert mitigation_overdue, got %#v", alerts[2])
	}
	if alerts[3].Category != "unit_no_update" || alerts[3].OrgName != "Direktorat B" {
		t.Fatalf("expected unit_no_update for Direktorat B, got %#v", alerts[3])
	}
}
