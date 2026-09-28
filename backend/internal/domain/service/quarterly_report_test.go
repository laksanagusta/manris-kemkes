package service

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestQuarterlyTargetDenominatorAndNewRisk(t *testing.T) {
	cycle := "2026-Q2"
	data := &entity.QuarterlyReportData{Cycle: cycle, GeneratedAt: time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)}
	for i := 0; i < 10; i++ {
		r := &entity.Risk{ID: uuid.New(), VersionGroupID: uuid.New(), Nilai: 9.5, TargetProbability: 2, TargetImpact: 2, TargetWeight: 1.8, TargetNilai: 7.2}
		if i < 2 {
			observed := 7.0
			status := "final"
			r.MonitoringStatus = &status
			r.MonitoringAssessmentCycle = &cycle
			r.MonitoringObservedNilai = &observed
		}
		data.Risks = append(data.Risks, &entity.QuarterlyReportRisk{Risk: r})
	}
	s := SummarizeQuarterlyReport(data)
	if s.TargetReached != 2 || s.TargetAssessable != 2 || s.TargetUnassessable != 8 || s.FinalMonitoring != 2 {
		t.Fatalf("target denominator must be 2/2 with 8 unknown: %+v", s)
	}
	if s.AboveAppetite != 10 || s.Movement.New != 10 || s.Movement.Stable != 0 {
		t.Fatalf("rounded appetite and distinct new category: %+v", s)
	}
}

func TestQuarterlyTaskReportingAndUnknownLoss(t *testing.T) {
	now := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	reported := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	data := &entity.QuarterlyReportData{Cycle: "2026-Q2", GeneratedAt: now}
	for _, task := range []*entity.MitigationTask{
		{Status: "done", Notes: "done", DueDate: "2026-06-01"},
		{Status: "done", Notes: "Valid progress report", ReportedAt: &reported, DueDate: "2026-06-01"},
		{Status: "pending", DueDate: "2026-12-02"},
		{Status: "skipped", DueDate: "2026-06-01"},
		{Status: "not_reported", DueDate: "2026-06-01"},
	} {
		data.Tasks = append(data.Tasks, &entity.QuarterlyReportTask{MitigationTask: task})
	}
	loss := 100.0
	known := true
	event := &entity.RiskEvent{ID: uuid.New(), FinancialLoss: &loss, FinancialLossKnown: &known}
	data.Events = []*entity.RiskEvent{event, event, {ID: uuid.New()}}
	s := SummarizeQuarterlyReport(data)
	if s.Tasks.Total != 5 || s.Tasks.Reported != 1 || s.Tasks.Overdue != 1 || s.Tasks.Pending != 1 || s.Tasks.NotReported != 1 || s.Tasks.Skipped != 1 || s.Tasks.LateReports != 1 {
		t.Fatalf("reporting statuses or quarter cutoff wrong: %+v", s.Tasks)
	}
	if s.Events.Total != 2 || s.Events.KnownLoss != 100 || s.Events.UnknownLoss != 1 {
		t.Fatalf("events must deduplicate and preserve unknown losses: %+v", s.Events)
	}
}

func TestQuarterlyRejectsDraftObservationAndBareDone(t *testing.T) {
	value, cycle, status := 1.0, "2026-Q2", "draft"
	risk := &entity.Risk{MonitoringObservedNilai: &value, MonitoringAssessmentCycle: &cycle, MonitoringStatus: &status}
	if _, valid := QuarterlyFinalObservation(risk, cycle); valid {
		t.Fatal("draft observations cannot assess targets")
	}
	status = "final"
	if _, valid := QuarterlyFinalObservation(risk, "2026-Q1"); valid {
		t.Fatal("other-quarter observations cannot assess targets")
	}
	reported := time.Now()
	for _, notes := range []string{"", "Done", string(make([]byte, 1001))} {
		if QuarterlyTaskReported(&entity.MitigationTask{Status: "done", Notes: notes, ReportedAt: &reported}) {
			t.Fatal("done needs a valid progress report")
		}
	}
	if !QuarterlyTaskReported(&entity.MitigationTask{Status: "done", Notes: "😊😊😊", ReportedAt: &reported}) {
		t.Fatal("UTF8 byte length must match the application validation rule")
	}
	if QuarterlyTaskReportingStatus(&entity.MitigationTask{DueDate: "2026-06-30"}, "2026-Q2", time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)) != "overdue" {
		t.Fatal("latest retrospective report must recognize expired reporting deadlines")
	}
}
