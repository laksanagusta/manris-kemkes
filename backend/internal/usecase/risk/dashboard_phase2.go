package risk

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type dashboardTaskRepo interface {
	ListAll(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error)
}

type dashboardRiskRepo interface {
	List(ctx context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error)
	ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error)
	CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error)
}

var (
	_ dashboardTaskRepo = repository.MitigationTaskRepository(nil)
	_ dashboardRiskRepo = repository.RiskRepository(nil)
)

type DashboardActionPressureUseCase struct {
	taskRepo dashboardTaskRepo
	now      func() time.Time
}

func NewDashboardActionPressureUseCase(taskRepo dashboardTaskRepo) *DashboardActionPressureUseCase {
	return &DashboardActionPressureUseCase{
		taskRepo: taskRepo,
		now:      time.Now,
	}
}

type DashboardActionPressureInput struct {
	Interval string
	Window   int
	OrgIDs   []uuid.UUID
}

func (uc *DashboardActionPressureUseCase) Execute(ctx context.Context, input DashboardActionPressureInput) ([]*entity.DashboardActionPressurePoint, error) {
	interval := strings.ToLower(strings.TrimSpace(input.Interval))
	if interval == "" {
		interval = "month"
	}
	if interval != "month" {
		return nil, errors.ErrInvalidInput
	}
	if input.Window <= 0 {
		input.Window = 6
	}

	now := uc.now().UTC()
	points, pointIndex := buildMonthlyPressureWindow(now, input.Window)

	tasks, err := uc.taskRepo.ListAll(ctx, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list mitigation tasks for action pressure")
	}

	for _, task := range tasks {
		if dueDate, ok := parseDateOnly(task.DueDate); ok {
			period := dueDate.Format("2006-01")
			if idx, ok := pointIndex[period]; ok {
				points[idx].TotalMitigations += 1
			}
		}

		if task.Status == "done" && task.ReportedAt != nil {
			period := task.ReportedAt.UTC().Format("2006-01")
			if idx, ok := pointIndex[period]; ok {
				points[idx].MitigationsCompleted += 1
			}
		}

		dueDate, ok := parseDateOnly(task.DueDate)
		if !ok || !isPendingLikeTask(task.Status) || !dueDate.Before(now) {
			continue
		}
		period := dueDate.Format("2006-01")
		if idx, ok := pointIndex[period]; ok {
			points[idx].OverdueMitigations += 1
		}
	}

	return points, nil
}

type ExecutiveAlertsUseCase struct {
	riskRepo dashboardRiskRepo
	taskRepo dashboardTaskRepo
	now      func() time.Time
}

func NewExecutiveAlertsUseCase(riskRepo dashboardRiskRepo, taskRepo dashboardTaskRepo) *ExecutiveAlertsUseCase {
	return &ExecutiveAlertsUseCase{
		riskRepo: riskRepo,
		taskRepo: taskRepo,
		now:      time.Now,
	}
}

type ExecutiveAlertsInput struct {
	Cycle  string
	Limit  int
	OrgIDs []uuid.UUID
}

func (uc *ExecutiveAlertsUseCase) Execute(ctx context.Context, input ExecutiveAlertsInput) ([]*entity.ExecutiveAlert, error) {
	if input.Limit <= 0 {
		input.Limit = 10
	}
	if input.Cycle == "" {
		input.Cycle = currentGlobalCycle(uc.now())
	}
	previousCycle := previousGlobalCycle(input.Cycle)

	currentRisks, err := uc.riskRepo.ListCycleSnapshot(ctx, input.Cycle, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load current cycle snapshot")
	}
	previousRisks, err := uc.riskRepo.ListCycleSnapshot(ctx, previousCycle, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load previous cycle snapshot")
	}
	comparisons, err := uc.riskRepo.CompareCycles(ctx, previousCycle, input.Cycle, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to compare cycles for executive alerts")
	}
	approvedRisks, err := uc.riskRepo.List(ctx, input.OrgIDs, "approved", "")
	if err != nil {
		return nil, errors.Wrap(err, "failed to load approved risks for executive alerts")
	}
	tasks, err := uc.taskRepo.ListAll(ctx, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load mitigation tasks for executive alerts")
	}

	comparisonByCode := make(map[string]*entity.RiskCycleComparisonItem, len(comparisons))
	for _, item := range comparisons {
		comparisonByCode[item.Code] = item
	}

	riskByID := make(map[uuid.UUID]*entity.Risk, len(approvedRisks))
	for _, risk := range approvedRisks {
		riskByID[risk.ID] = risk
	}

	type rankedAlert struct {
		priority int
		alert    *entity.ExecutiveAlert
	}

	alerts := make([]rankedAlert, 0)
	for _, risk := range currentRisks {
		if risk.GetEffectiveScore() < 17 {
			continue
		}
		if _, ok := comparisonByCode[risk.Code]; ok {
			continue
		}
		alerts = append(alerts, rankedAlert{
			priority: 1,
			alert: &entity.ExecutiveAlert{
				ID:       fmt.Sprintf("new-extreme-%s", risk.Code),
				Category: "new_extreme",
				Severity: "high",
				Title:    fmt.Sprintf("Risiko ekstrem baru: %s", risk.Code),
				Detail:   fmt.Sprintf("%s masuk cycle %s pada level ekstrem.", fallbackText(risk.OrgName, "Unit tidak diketahui"), input.Cycle),
				OrgName:  risk.OrgName,
				RiskCode: risk.Code,
			},
		})
	}

	for _, comparison := range comparisons {
		if comparison.Movement != "up" {
			continue
		}
		alerts = append(alerts, rankedAlert{
			priority: 2,
			alert: &entity.ExecutiveAlert{
				ID:       fmt.Sprintf("risk-up-%s", comparison.Code),
				Category: "risk_up",
				Severity: "high",
				Title:    fmt.Sprintf("Risiko naik level: %s", comparison.Code),
				Detail:   fmt.Sprintf("%s berubah dari %s ke %s pada cycle %s.", fallbackText(comparison.OrgName, "Unit tidak diketahui"), comparison.PreviousLevel, comparison.CurrentLevel, input.Cycle),
				OrgName:  comparison.OrgName,
				RiskCode: comparison.Code,
			},
		})
	}

	overdueCutoff := uc.now().AddDate(0, 0, -30)
	for _, task := range tasks {
		dueDate, ok := parseDateOnly(task.DueDate)
		if !ok || !isPendingLikeTask(task.Status) || !dueDate.Before(overdueCutoff) {
			continue
		}
		risk := riskByID[task.RiskID]
		orgName := ""
		if risk != nil {
			orgName = risk.OrgName
		}
		alerts = append(alerts, rankedAlert{
			priority: 3,
			alert: &entity.ExecutiveAlert{
				ID:       fmt.Sprintf("overdue-%s", task.ID.String()),
				Category: "mitigation_overdue",
				Severity: "medium",
				Title:    fmt.Sprintf("Mitigasi overdue >30 hari: %s", fallbackText(task.RiskCode, "Tanpa kode")),
				Detail:   fmt.Sprintf("%s belum selesai sejak %s.", fallbackText(task.MitigationAction, "Mitigasi terkait"), dueDate.Format("2006-01-02")),
				OrgName:  orgName,
				RiskCode: task.RiskCode,
			},
		})
	}

	currentOrgs := make(map[string]struct{})
	for _, risk := range currentRisks {
		if risk.OrgName == "" {
			continue
		}
		currentOrgs[risk.OrgName] = struct{}{}
	}
	seenMissingOrg := make(map[string]struct{})
	for _, risk := range previousRisks {
		if risk.OrgName == "" {
			continue
		}
		if _, ok := currentOrgs[risk.OrgName]; ok {
			continue
		}
		if _, ok := seenMissingOrg[risk.OrgName]; ok {
			continue
		}
		seenMissingOrg[risk.OrgName] = struct{}{}
		alerts = append(alerts, rankedAlert{
			priority: 4,
			alert: &entity.ExecutiveAlert{
				ID:       fmt.Sprintf("unit-no-update-%s", sanitizeKey(risk.OrgName)),
				Category: "unit_no_update",
				Severity: "medium",
				Title:    fmt.Sprintf("Unit belum update cycle: %s", risk.OrgName),
				Detail:   fmt.Sprintf("Unit muncul di %s tetapi belum punya snapshot approved di %s.", previousCycle, input.Cycle),
				OrgName:  risk.OrgName,
			},
		})
	}

	sort.SliceStable(alerts, func(i, j int) bool {
		if alerts[i].priority != alerts[j].priority {
			return alerts[i].priority < alerts[j].priority
		}
		return alerts[i].alert.Title < alerts[j].alert.Title
	})

	if len(alerts) > input.Limit {
		alerts = alerts[:input.Limit]
	}

	result := make([]*entity.ExecutiveAlert, 0, len(alerts))
	for _, item := range alerts {
		result = append(result, item.alert)
	}
	return result, nil
}

func buildMonthlyPressureWindow(now time.Time, window int) ([]*entity.DashboardActionPressurePoint, map[string]int) {
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -(window - 1), 0)
	points := make([]*entity.DashboardActionPressurePoint, 0, window)
	index := make(map[string]int, window)
	for i := 0; i < window; i += 1 {
		periodTime := start.AddDate(0, i, 0)
		period := periodTime.Format("2006-01")
		points = append(points, &entity.DashboardActionPressurePoint{Period: period})
		index[period] = i
	}
	return points, index
}

func parseDateOnly(value string) (time.Time, bool) {
	if strings.TrimSpace(value) == "" {
		return time.Time{}, false
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, false
	}
	return parsed.UTC(), true
}

func isPendingLikeTask(status string) bool {
	return status == "pending" || status == "overdue"
}

func currentGlobalCycle(now time.Time) string {
	quarter := (int(now.Month())-1)/3 + 1
	return fmt.Sprintf("%d-Q%d", now.Year(), quarter)
}

func previousGlobalCycle(cycle string) string {
	parts := strings.Split(cycle, "-")
	if len(parts) != 2 {
		return cycle
	}
	year, err := time.Parse("2006", parts[0])
	if err != nil {
		return cycle
	}
	if strings.EqualFold(parts[1], "Q1") {
		return fmt.Sprintf("%d-Q4", year.Year()-1)
	}
	if strings.HasPrefix(strings.ToUpper(parts[1]), "Q") {
		var quarter int
		if _, err := fmt.Sscanf(parts[1][1:], "%d", &quarter); err == nil && quarter > 1 && quarter <= 4 {
			return fmt.Sprintf("%d-Q%d", year.Year(), quarter-1)
		}
	}
	if strings.EqualFold(parts[1], "H1") {
		return fmt.Sprintf("%d-Q1", year.Year())
	}
	if strings.EqualFold(parts[1], "H2") {
		return fmt.Sprintf("%d-Q3", year.Year())
	}
	return fmt.Sprintf("%d-Q1", year.Year())
}

func fallbackText(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func sanitizeKey(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, ".", "")
	return value
}
