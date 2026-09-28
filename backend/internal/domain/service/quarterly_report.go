package service

import (
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
)

type QuarterlyTaskSummary struct {
	Total, Reported, Pending, Overdue, NotReported, Skipped, LateReports int
}

type QuarterlyEventSummary struct {
	Total, Unlinked, UnknownLoss, KnownLossCount int
	KnownLoss                                    float64
	Severity, Condition                          map[string]int
}

type QuarterlyMovement struct {
	New, Worsened, Improved, Stable, Inactive int
}

type QuarterlySummary struct {
	TotalRisks, AboveAppetite, TargetsAvailable, TargetReached, TargetAssessable, TargetUnassessable, FinalMonitoring int
	Movement                                                                                                          QuarterlyMovement
	Tasks                                                                                                             QuarterlyTaskSummary
	Events                                                                                                            QuarterlyEventSummary
}

// QuarterlyPeriodBounds uses the same Jakarta calendar as monitoring tasks and
// event dates. End is exclusive; callers must validate YYYY-Q[1-4] first.
func QuarterlyPeriodBounds(cycle string) (time.Time, time.Time) {
	year, _ := strconv.Atoi(cycle[:4])
	quarter, _ := strconv.Atoi(cycle[6:])
	start := time.Date(year, time.Month((quarter-1)*3+1), 1, 0, 0, 0, 0, timeutil.JakartaLocation())
	return start, start.AddDate(0, 3, 0)
}

func QuarterlyProfileNilai(r *entity.Risk) float64 {
	if r.Nilai > 0 && !math.IsNaN(r.Nilai) && !math.IsInf(r.Nilai, 0) {
		return r.Nilai
	}
	if r.Probability > 0 && r.Impact > 0 && r.Weight > 0 {
		return entity.CalculateNilai(r.Probability, r.Impact, r.Weight)
	}
	return float64(r.InherentScore)
}

func QuarterlyTargetNilai(r *entity.Risk) (float64, bool) {
	if r.TargetProbability < 1 || r.TargetProbability > 5 || r.TargetImpact < 1 || r.TargetImpact > 5 || r.TargetWeight <= 0 {
		return 0, false
	}
	value := r.TargetNilai
	if value <= 0 {
		value = entity.CalculateNilai(r.TargetProbability, r.TargetImpact, r.TargetWeight)
	}
	return value, value > 0 && !math.IsNaN(value) && !math.IsInf(value, 0)
}

func QuarterlyFinalObservation(r *entity.Risk, cycle string) (float64, bool) {
	if r.MonitoringStatus == nil || *r.MonitoringStatus != entity.RiskMonitoringStatusFinal || r.MonitoringAssessmentCycle == nil || *r.MonitoringAssessmentCycle != cycle || r.MonitoringObservedNilai == nil {
		return 0, false
	}
	value := *r.MonitoringObservedNilai
	return value, value > 0 && !math.IsNaN(value) && !math.IsInf(value, 0)
}

func QuarterlyTaskReported(t *entity.MitigationTask) bool {
	length := len(strings.TrimSpace(t.Notes))
	return t.Status == entity.MitigationTaskStatusDone && t.ReportedAt != nil && length >= 10 && length <= 1000
}

// QuarterlyTaskReportingStatus is mutually exclusive. A closed unreported task
// stays not_reported; a skipped task remains visible in the required denominator.
func QuarterlyTaskReportingStatus(t *entity.MitigationTask, cycle string, now time.Time) string {
	if QuarterlyTaskReported(t) {
		return "reported"
	}
	if t.Status == entity.MitigationTaskStatusSkipped || t.Status == entity.MitigationTaskStatusNotReported {
		return t.Status
	}
	cutoff := now.In(timeutil.JakartaLocation()).Format("2006-01-02")
	if _, err := time.Parse("2006-01-02", t.DueDate); err == nil && t.DueDate < cutoff {
		return "overdue"
	}
	return "pending"
}

func QuarterlyTaskReportLate(t *entity.MitigationTask) bool {
	if !QuarterlyTaskReported(t) {
		return false
	}
	if _, err := time.Parse("2006-01-02", t.DueDate); err != nil {
		return false
	}
	return t.ReportedAt.In(timeutil.JakartaLocation()).Format("2006-01-02") > t.DueDate
}

func SummarizeQuarterlyReport(data *entity.QuarterlyReportData) QuarterlySummary {
	s := QuarterlySummary{Events: QuarterlyEventSummary{Severity: map[string]int{}, Condition: map[string]int{}}}
	previous := make(map[uuid.UUID]*entity.Risk, len(data.PreviousRisks))
	for _, r := range data.PreviousRisks {
		if r != nil && r.Risk != nil {
			previous[quarterlyRiskGroup(r.Risk)] = r.Risk
		}
	}
	for _, r := range data.Risks {
		if r == nil || r.Risk == nil {
			continue
		}
		s.TotalRisks++
		value := QuarterlyProfileNilai(r.Risk)
		if math.Round(value) >= 10 {
			s.AboveAppetite++
		}
		observed, final := QuarterlyFinalObservation(r.Risk, data.Cycle)
		if final {
			s.FinalMonitoring++
		}
		target, valid := QuarterlyTargetNilai(r.Risk)
		if valid {
			s.TargetsAvailable++
		}
		if valid && final {
			s.TargetAssessable++
			if observed <= target {
				s.TargetReached++
			}
		} else {
			s.TargetUnassessable++
		}
		prior := previous[quarterlyRiskGroup(r.Risk)]
		if prior == nil {
			s.Movement.New++
		} else {
			change := math.Round(value) - math.Round(QuarterlyProfileNilai(prior))
			if value <= 0 || QuarterlyProfileNilai(prior) <= 0 {
				change = 0
			}
			switch {
			case change > 0:
				s.Movement.Worsened++
			case change < 0:
				s.Movement.Improved++
			default:
				s.Movement.Stable++
			}
			delete(previous, quarterlyRiskGroup(r.Risk))
		}
	}
	s.Movement.Inactive = len(previous)
	for _, t := range data.Tasks {
		if t == nil || t.MitigationTask == nil {
			continue
		}
		s.Tasks.Total++
		switch QuarterlyTaskReportingStatus(t.MitigationTask, data.Cycle, data.GeneratedAt) {
		case "reported":
			s.Tasks.Reported++
		case "overdue":
			s.Tasks.Overdue++
		case "not_reported":
			s.Tasks.NotReported++
		case "skipped":
			s.Tasks.Skipped++
		default:
			s.Tasks.Pending++
		}
		if QuarterlyTaskReportLate(t.MitigationTask) {
			s.Tasks.LateReports++
		}
	}
	seen := map[uuid.UUID]bool{}
	for _, e := range data.Events {
		if e == nil || seen[e.ID] {
			continue
		}
		seen[e.ID] = true
		s.Events.Total++
		s.Events.Severity[e.Severity]++
		s.Events.Condition[e.PostResponseCondition]++
		if (e.HasLinkedRisks == nil && len(e.LinkedRisks) == 0) || (e.HasLinkedRisks != nil && !*e.HasLinkedRisks) {
			s.Events.Unlinked++
		}
		if e.FinancialLoss != nil && e.FinancialLossKnown != nil && *e.FinancialLossKnown && *e.FinancialLoss >= 0 && !math.IsNaN(*e.FinancialLoss) && !math.IsInf(*e.FinancialLoss, 0) {
			s.Events.KnownLoss += *e.FinancialLoss
			s.Events.KnownLossCount++
		} else {
			s.Events.UnknownLoss++
		}
	}
	return s
}

func quarterlyRiskGroup(r *entity.Risk) uuid.UUID {
	if r.VersionGroupID == uuid.Nil {
		return r.ID
	}
	return r.VersionGroupID
}
