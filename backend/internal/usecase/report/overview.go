package report

import (
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
)

type quarterlyTaskState string

const (
	quarterlyTaskReported    quarterlyTaskState = "reported"
	quarterlyTaskPending     quarterlyTaskState = "pending"
	quarterlyTaskOverdue     quarterlyTaskState = "overdue"
	quarterlyTaskNotReported quarterlyTaskState = "not_reported"
	quarterlyTaskSkipped     quarterlyTaskState = "skipped"
)

type classifiedQuarterlyTask struct {
	task  *entity.QuarterlyReportTask
	state quarterlyTaskState
}

type quarterlyRiskRow struct {
	risk        *entity.QuarterlyReportRisk
	movement    string
	final       bool
	targetState string
	above       bool
	attention   int
}

func BuildQuarterlyReportOverview(data *entity.QuarterlyReportData) *entity.QuarterlyReportOverview {
	if data == nil {
		return nil
	}

	currentTasks := classifyQuarterlyTasks(data.Tasks, data.Cycle, data.GeneratedAt)
	previousTasks := classifyQuarterlyTasks(data.PreviousTasks, data.ComparisonCycle, data.GeneratedAt)
	currentRows := buildQuarterlyRiskRows(data.Risks, data.PreviousRisks, currentTasks, data.Cycle)
	previousRows := buildQuarterlyRiskRows(data.PreviousRisks, nil, previousTasks, data.ComparisonCycle)
	events := deduplicateQuarterlyEvents(data.Events)

	currentSummary := summarizeQuarterlyReport(currentRows, currentTasks, events)
	previousSummary := summarizeQuarterlyReport(previousRows, previousTasks, nil)
	movement := quarterlyMovement(currentRows, data.PreviousRisks)
	taskCounts := countQuarterlyTaskStates(currentTasks)
	severityCounts := countQuarterlyEventSeverities(events)
	recentEvents := recentQuarterlyEventPreviews(events)
	units := buildQuarterlyUnitOverviews(data.Organizations, currentRows, currentTasks, events)

	return &entity.QuarterlyReportOverview{
		Cycle: data.Cycle, ComparisonCycle: data.ComparisonCycle,
		GeneratedAt: data.GeneratedAt, DataUpdatedAt: data.DataUpdatedAt,
		SnapshotHash: data.SnapshotHash, Warnings: data.Warnings,
		Summary: currentSummary, PreviousSummary: previousSummary,
		Movement: movement, HasRisks: len(currentRows) > 0,
		TaskCounts: taskCounts, RecentEvents: recentEvents,
		SeverityCounts: severityCounts, Units: units,
	}
}

func classifyQuarterlyTasks(tasks []*entity.QuarterlyReportTask, cycle string, generatedAt time.Time) []classifiedQuarterlyTask {
	classified := make([]classifiedQuarterlyTask, 0, len(tasks))
	for _, task := range tasks {
		if task == nil || task.MitigationTask == nil {
			continue
		}
		classified = append(classified, classifiedQuarterlyTask{
			task: task, state: classifyQuarterlyTask(task, cycle, generatedAt),
		})
	}
	return classified
}

func classifyQuarterlyTask(task *entity.QuarterlyReportTask, cycle string, generatedAt time.Time) quarterlyTaskState {
	if task == nil || task.MitigationTask == nil {
		return quarterlyTaskPending
	}
	item := task.MitigationTask
	noteLength := len([]byte(strings.TrimSpace(item.Notes)))
	if item.Status == entity.MitigationTaskStatusDone && item.ReportedAt != nil && !item.ReportedAt.IsZero() && noteLength >= 10 && noteLength <= 1000 {
		return quarterlyTaskReported
	}
	if item.Status == entity.MitigationTaskStatusNotReported {
		return quarterlyTaskNotReported
	}
	if item.Status == entity.MitigationTaskStatusSkipped {
		return quarterlyTaskSkipped
	}
	_ = cycle // Task attribution is already captured by the period query.
	deadline := quarterlyCalendarDate(item.DueDate, timeutil.JakartaLocation())
	if deadline != "" && deadline < generatedAt.In(timeutil.JakartaLocation()).Format("2006-01-02") {
		return quarterlyTaskOverdue
	}
	return quarterlyTaskPending
}

func quarterlyCalendarDate(value string, location *time.Location) string {
	if parsed, err := time.Parse("2006-01-02", value); err == nil {
		return parsed.Format("2006-01-02")
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed.In(location).Format("2006-01-02")
		}
	}
	return ""
}

func buildQuarterlyRiskRows(
	risks, previous []*entity.QuarterlyReportRisk,
	tasks []classifiedQuarterlyTask,
	cycle string,
) []quarterlyRiskRow {
	previousByGroup := make(map[uuid.UUID]*entity.QuarterlyReportRisk, len(previous))
	for _, risk := range previous {
		if risk != nil && risk.Risk != nil {
			previousByGroup[quarterlyRiskGroupID(risk.Risk)] = risk
		}
	}
	rows := make([]quarterlyRiskRow, 0, len(risks))
	for _, item := range risks {
		if item == nil || item.Risk == nil {
			continue
		}
		risk := item.Risk
		before := previousByGroup[quarterlyRiskGroupID(risk)]
		profile := quarterlyProfileValue(risk)
		previousProfile := (*float64)(nil)
		if before != nil && before.Risk != nil {
			previousProfile = quarterlyProfileValue(before.Risk)
		}
		movement := "new"
		if before != nil {
			movement = "stable"
			if profile != nil && previousProfile != nil {
				if math.Round(*profile) > math.Round(*previousProfile) {
					movement = "up"
				} else if math.Round(*profile) < math.Round(*previousProfile) {
					movement = "down"
				}
			}
		}
		final := risk.MonitoringStatus != nil && *risk.MonitoringStatus == entity.RiskMonitoringStatusFinal &&
			risk.MonitoringAssessmentCycle != nil && *risk.MonitoringAssessmentCycle == cycle &&
			risk.MonitoringObservedNilai != nil && *risk.MonitoringObservedNilai > 0
		target := quarterlyTargetValue(risk)
		targetState := "unavailable"
		if final && target != nil {
			if *risk.MonitoringObservedNilai <= *target {
				targetState = "achieved"
			} else {
				targetState = "missed"
			}
		}
		above := profile != nil && math.Round(*profile) >= 10
		overdueTasks := 0
		for _, classified := range tasks {
			if classified.task == nil || classified.task.MitigationTask == nil || classified.state != quarterlyTaskOverdue {
				continue
			}
			task := classified.task
			if task.VersionGroupID == quarterlyRiskGroupID(risk) || task.RiskID == risk.ID {
				overdueTasks++
			}
		}
		attention := 0
		if movement == "up" {
			attention++
		}
		if targetState == "missed" {
			attention++
		}
		if !final {
			attention++
		}
		if overdueTasks > 0 {
			attention++
		}
		rows = append(rows, quarterlyRiskRow{
			risk: item, movement: movement, final: final,
			targetState: targetState, above: above, attention: attention,
		})
	}
	return rows
}

func quarterlyRiskGroupID(risk *entity.Risk) uuid.UUID {
	if risk.VersionGroupID != uuid.Nil {
		return risk.VersionGroupID
	}
	return risk.ID
}

func quarterlyProfileValue(risk *entity.Risk) *float64 {
	if risk.Nilai > 0 {
		value := risk.Nilai
		return &value
	}
	if risk.Probability > 0 && risk.Impact > 0 && risk.Weight > 0 {
		value := math.Round(float64(risk.Probability)*float64(risk.Impact)*risk.Weight*100) / 100
		return &value
	}
	if risk.InherentScore > 0 {
		value := float64(risk.InherentScore)
		return &value
	}
	return nil
}

func quarterlyTargetValue(risk *entity.Risk) *float64 {
	if risk.TargetProbability < 1 || risk.TargetProbability > 5 || risk.TargetImpact < 1 || risk.TargetImpact > 5 || risk.TargetWeight <= 0 {
		return nil
	}
	if risk.TargetNilai > 0 {
		value := risk.TargetNilai
		return &value
	}
	value := math.Round(float64(risk.TargetProbability)*float64(risk.TargetImpact)*risk.TargetWeight*100) / 100
	return &value
}

func summarizeQuarterlyReport(
	rows []quarterlyRiskRow,
	tasks []classifiedQuarterlyTask,
	events []*entity.RiskEvent,
) entity.QuarterlyEvaluationSummary {
	var above, eligible, achieved, final, targetsAvailable int
	for _, row := range rows {
		if row.above {
			above++
		}
		if row.targetState != "unavailable" {
			eligible++
		}
		if row.targetState == "achieved" {
			achieved++
		}
		if row.final {
			final++
		}
		if row.risk != nil && row.risk.Risk != nil && quarterlyTargetValue(row.risk.Risk) != nil {
			targetsAvailable++
		}
	}
	var reported, overdue, evidenceAvailable int
	for _, task := range tasks {
		if task.state == quarterlyTaskReported {
			reported++
			if task.task != nil && task.task.MitigationTask != nil && strings.TrimSpace(task.task.EvidenceURL) != "" {
				evidenceAvailable++
			}
		}
		if task.state == quarterlyTaskOverdue {
			overdue++
		}
	}
	knownLossCount, unlinked := 0, 0
	knownLoss := float64(0)
	for _, event := range events {
		if event == nil {
			continue
		}
		if event.FinancialLossKnown != nil && *event.FinancialLossKnown && event.FinancialLoss != nil && !math.IsNaN(*event.FinancialLoss) && !math.IsInf(*event.FinancialLoss, 0) && *event.FinancialLoss >= 0 {
			knownLossCount++
			knownLoss += *event.FinancialLoss
		}
		linked := len(event.LinkedRisks) > 0
		if event.HasLinkedRisks != nil {
			linked = *event.HasLinkedRisks
		}
		if !linked {
			unlinked++
		}
	}
	total := len(rows)
	taskTotal := len(tasks)
	return entity.QuarterlyEvaluationSummary{
		Total:            total,
		Appetite:         entity.QuarterlyAppetiteSummary{Above: above, Total: total, Rate: quarterlyPercentage(above, total)},
		Target:           entity.QuarterlyTargetSummary{Achieved: achieved, Eligible: eligible, Unavailable: total - eligible, Rate: quarterlyPercentage(achieved, eligible)},
		Monitoring:       entity.QuarterlyMonitoringSummary{Final: final, Total: total, Rate: quarterlyPercentage(final, total)},
		Mitigation:       entity.QuarterlyMitigationSummary{Reported: reported, Total: taskTotal, Rate: quarterlyPercentage(reported, taskTotal), Overdue: overdue},
		Events:           entity.QuarterlyEventSummary{Total: len(events), KnownLoss: knownLoss, KnownLossCount: knownLossCount, UnknownLoss: len(events) - knownLossCount, Unlinked: unlinked},
		TargetsAvailable: targetsAvailable, EvidenceAvailable: evidenceAvailable,
	}
}

func quarterlyPercentage(numerator, denominator int) *float64 {
	if denominator == 0 {
		return nil
	}
	value := float64(numerator) / float64(denominator) * 100
	return &value
}

func quarterlyMovement(rows []quarterlyRiskRow, previous []*entity.QuarterlyReportRisk) entity.QuarterlyRiskMovementSummary {
	result := entity.QuarterlyRiskMovementSummary{}
	currentGroups := make(map[uuid.UUID]struct{}, len(rows))
	for _, row := range rows {
		if row.risk == nil || row.risk.Risk == nil {
			continue
		}
		currentGroups[quarterlyRiskGroupID(row.risk.Risk)] = struct{}{}
		switch row.movement {
		case "up":
			result.Up++
		case "down":
			result.Down++
		case "stable":
			result.Stable++
		case "new":
			result.New++
		}
	}
	for _, item := range previous {
		if item == nil || item.Risk == nil {
			continue
		}
		if _, exists := currentGroups[quarterlyRiskGroupID(item.Risk)]; !exists {
			result.Absent++
		}
	}
	return result
}

func countQuarterlyTaskStates(tasks []classifiedQuarterlyTask) entity.QuarterlyTaskStateCounts {
	result := entity.QuarterlyTaskStateCounts{Total: len(tasks)}
	for _, task := range tasks {
		switch task.state {
		case quarterlyTaskReported:
			result.Reported++
		case quarterlyTaskOverdue:
			result.Overdue++
		case quarterlyTaskNotReported:
			result.NotReported++
		case quarterlyTaskSkipped:
			result.Skipped++
		default:
			result.Pending++
		}
	}
	return result
}

func deduplicateQuarterlyEvents(events []*entity.RiskEvent) []*entity.RiskEvent {
	seen := make(map[uuid.UUID]struct{}, len(events))
	result := make([]*entity.RiskEvent, 0, len(events))
	for _, event := range events {
		if event == nil {
			continue
		}
		if _, exists := seen[event.ID]; exists {
			continue
		}
		seen[event.ID] = struct{}{}
		result = append(result, event)
	}
	return result
}

func countQuarterlyEventSeverities(events []*entity.RiskEvent) entity.QuarterlyEventSeverityCounts {
	result := entity.QuarterlyEventSeverityCounts{}
	for _, event := range events {
		if event == nil {
			continue
		}
		switch event.Severity {
		case entity.RiskEventSeverityLow:
			result.Low++
		case entity.RiskEventSeverityMedium:
			result.Medium++
		case entity.RiskEventSeverityHigh:
			result.High++
		case entity.RiskEventSeverityExtreme:
			result.Extreme++
		}
	}
	return result
}

func recentQuarterlyEventPreviews(events []*entity.RiskEvent) []entity.QuarterlyReportEventPreview {
	sorted := append([]*entity.RiskEvent(nil), events...)
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].OccurredAt.Equal(sorted[j].OccurredAt) {
			return sorted[i].ID.String() < sorted[j].ID.String()
		}
		return sorted[i].OccurredAt.After(sorted[j].OccurredAt)
	})
	limit := min(3, len(sorted))
	result := make([]entity.QuarterlyReportEventPreview, 0, limit)
	for _, event := range sorted[:limit] {
		result = append(result, entity.QuarterlyReportEventPreview{
			ID: event.ID.String(), Code: event.Code, Description: event.Description,
			OccurredAt: event.OccurredAt, OrganizationName: event.OrganizationName,
			PostResponseCondition: event.PostResponseCondition, Severity: event.Severity,
		})
	}
	return result
}

func buildQuarterlyUnitOverviews(
	organizations []entity.QuarterlyReportOrganization,
	rows []quarterlyRiskRow,
	tasks []classifiedQuarterlyTask,
	events []*entity.RiskEvent,
) []entity.QuarterlyReportUnitOverview {
	units := make([]entity.QuarterlyReportUnitOverview, 0, len(organizations))
	for _, organization := range organizations {
		unitRows := make([]quarterlyRiskRow, 0)
		unitTasks := make([]classifiedQuarterlyTask, 0)
		unitEvents := make([]*entity.RiskEvent, 0)
		attention := 0
		for _, row := range rows {
			if row.risk != nil && row.risk.Risk != nil && row.risk.OrganizationID != nil && row.risk.OrganizationID.String() == organization.ID.String() {
				unitRows = append(unitRows, row)
				if row.attention > 0 {
					attention++
				}
			}
		}
		for _, task := range tasks {
			if task.task != nil && task.task.OrganizationID == organization.ID {
				unitTasks = append(unitTasks, task)
			}
		}
		for _, event := range events {
			if event != nil && event.OrganizationID == organization.ID {
				unitEvents = append(unitEvents, event)
			}
		}
		units = append(units, entity.QuarterlyReportUnitOverview{
			ID: organization.ID.String(), Name: organization.Name,
			HasData:        len(unitRows)+len(unitTasks)+len(unitEvents) > 0,
			AttentionCount: attention,
			Summary:        summarizeQuarterlyReport(unitRows, unitTasks, unitEvents),
		})
	}
	sort.SliceStable(units, func(i, j int) bool {
		if units[i].AttentionCount != units[j].AttentionCount {
			return units[i].AttentionCount > units[j].AttentionCount
		}
		return strings.ToLower(units[i].Name) < strings.ToLower(units[j].Name)
	})
	return units
}
