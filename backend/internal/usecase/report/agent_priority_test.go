package report

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestAgentPriorityRanksCompletePopulationBeforePagination(t *testing.T) {
	now := time.Date(2026, 10, 24, 0, 0, 0, 0, time.UTC)
	data := &entity.QuarterlyReportData{GeneratedAt: now, Cycle: "2026-Q4"}
	risk := func(code string, score float64) *entity.Risk {
		r := &entity.Risk{ID: uuid.New(), VersionGroupID: uuid.New(), Code: code, Nilai: score}
		data.Risks = append(data.Risks, &entity.QuarterlyReportRisk{Risk: r})
		return r
	}
	low := risk("LOW", 4)
	high := risk("HIGH", 20)
	late := risk("LATE", 20)
	unknown := risk("UNKNOWN", 0)
	task := func(r *entity.Risk, due, status string) {
		data.Tasks = append(data.Tasks, &entity.QuarterlyReportTask{VersionGroupID: r.VersionGroupID, MitigationTask: &entity.MitigationTask{ID: uuid.New(), RiskID: r.ID, DueDate: due, Status: status}})
	}
	task(low, "2026-10-01", "pending")
	task(late, "2026-10-02", "overdue")
	task(late, "2026-10-10", "pending")
	task(high, "2026-10-24", "pending")
	task(unknown, "2026-09-01", "pending")
	risk("EXCLUDED", 5)
	// Duplicate source rows/tasks must not duplicate the result or its task count.
	data.Risks = append(data.Risks, data.Risks[2])
	data.Tasks = append(data.Tasks, data.Tasks[1])
	result, err := BuildAgentPriorities(data, 1, 2)
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 4 || len(result.Items) != 2 || result.Items[0].Risk.ID != late.ID || result.Items[1].Risk.ID != high.ID || len(result.Items[0].Tasks) != 2 {
		t.Fatalf("bad first page: %+v", result)
	}
	second, err := BuildAgentPriorities(data, 2, 2)
	if err != nil || second.Items[0].Risk.ID != low.ID || second.Items[1].Score != nil {
		t.Fatalf("unknown score fabricated or order incorrect: %+v %v", second, err)
	}
}

func TestAgentPriorityExcludesCompletedFutureAndInvalidTasks(t *testing.T) {
	data := &entity.QuarterlyReportData{GeneratedAt: time.Date(2026, 10, 23, 17, 0, 0, 0, time.UTC)} // midnight Jakarta
	r := &entity.Risk{ID: uuid.New(), Nilai: 4}
	data.Risks = []*entity.QuarterlyReportRisk{{Risk: r}}
	for _, item := range []struct{ due, status string }{{"2026-10-23", "done"}, {"invalid", "pending"}, {"2026-10-24", "overdue"}, {"2026-10-23", "skipped"}, {"2026-10-23", "not_reported"}} {
		data.Tasks = append(data.Tasks, &entity.QuarterlyReportTask{MitigationTask: &entity.MitigationTask{ID: uuid.New(), RiskID: r.ID, DueDate: item.due, Status: item.status}})
	}
	result, err := BuildAgentPriorities(data, 1, 5)
	if err != nil || result.Total != 0 {
		t.Fatalf("ineligible task became priority: %+v %v", result, err)
	}
	if _, err = BuildAgentPriorities(data, 0, 5); err == nil {
		t.Fatal("invalid pagination accepted")
	}
}
