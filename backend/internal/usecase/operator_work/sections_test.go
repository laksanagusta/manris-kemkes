package operator_work

import (
	"fmt"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"testing"
	"time"
)

func TestReportSevenDayWindowJakarta(t *testing.T) {
	actor := uuid.New()
	// Already October 29 in Jakarta.
	now := time.Date(2026, 10, 28, 17, 0, 0, 0, time.UTC)
	for _, tt := range []struct {
		name, due, end string
		want           int
	}{
		{"overdue", "2026-10-01", "2026-09-30", 1},
		{"today", "2026-10-29", "2026-10-28", 1},
		{"seven days", "2026-11-05", "2026-10-28", 1},
		{"eight days", "2026-11-06", "2026-10-28", 0},
		{"blocked period", "2026-11-05", "2026-11-01", 0},
		{"missing deadline", "", "2026-10-28", 0},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildItems([]Candidate{{Item: entity.OperatorWorkItem{Key: "report", Kind: "mitigation_report", DueDate: tt.due}, OwnerID: &actor, PeriodEnd: tt.end}}, actor, now)
			if len(got) != tt.want {
				t.Fatalf("got %d want %d", len(got), tt.want)
			}
		})
	}
}

func TestSectionsCountBeforeIndependentPreview(t *testing.T) {
	items := []entity.OperatorWorkItem{}
	for n := 0; n < 9; n++ {
		items = append(items, entity.OperatorWorkItem{Key: fmt.Sprint(n), Kind: "mitigation_report"})
	}
	items = append(items, entity.OperatorWorkItem{Key: "monitor", Kind: "monitoring_draft"}, entity.OperatorWorkItem{Key: "draft", Kind: "risk_draft"})
	sections := BuildSections(items)
	if len(sections) != 3 || sections[0].Key != "reports" || sections[1].Key != "monitoring" || sections[2].Key != "drafts" {
		t.Fatalf("incorrect order: %#v", sections)
	}
	if sections[0].Total != 9 || len(sections[0].Items) != 5 || sections[1].Total != 1 || sections[2].Total != 1 {
		t.Fatalf("incorrect counts/previews: %#v", sections)
	}
	page := PaginateSection(items, "reports", 2, 5)
	if len(page.Items) != 4 || page.HasNext || page.Total != 9 {
		t.Fatalf("incorrect second page: %#v", page)
	}
	if len(PaginateSection(items, "reports", 99, 5).Items) != 0 {
		t.Fatal("out of bounds page must be empty")
	}
	empty := BuildSections(nil)
	if len(empty) != 3 || empty[0].Items == nil || empty[1].Items == nil || empty[2].Items == nil {
		t.Fatal("empty sections must serialize as arrays")
	}
}
func TestBuildItemsStableTieOrder(t *testing.T) {
	actor := uuid.New()
	got := BuildItems([]Candidate{
		{Item: entity.OperatorWorkItem{Key: "z", Kind: "risk_draft"}, OwnerID: &actor},
		{Item: entity.OperatorWorkItem{Key: "a", Kind: "risk_draft"}, OwnerID: &actor},
	}, actor, time.Now())
	if len(got) != 2 || got[0].Key != "a" {
		t.Fatal("unstable order")
	}
}

func TestMonitoringDraftOnlyActionableInsideItsWindow(t *testing.T) {
	actor := uuid.New()
	candidate := Candidate{Item: entity.OperatorWorkItem{Key: "monitor", Kind: "monitoring_draft", Period: "2026-Q3"}, OwnerID: &actor}
	open := BuildItems([]Candidate{candidate}, actor, time.Date(2026, 10, 15, 0, 0, 0, 0, time.UTC))
	if len(open) != 1 || open[0].DueDate != "2026-10-31" {
		t.Fatalf("incorrect window deadline: %#v", open)
	}
	closed := BuildItems([]Candidate{candidate}, actor, time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC))
	if len(closed) != 0 {
		t.Fatal("expired draft remained actionable")
	}
}
