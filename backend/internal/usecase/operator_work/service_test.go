package operator_work

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"testing"
	"time"
)

func TestBuildItems(t *testing.T) {
	actor, other := uuid.New(), uuid.New()
	now := time.Date(2026, 12, 5, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		name      string
		candidate Candidate
		want      int
	}{
		{"own draft", Candidate{Item: entity.OperatorWorkItem{Kind: "risk_draft"}, OwnerID: &actor}, 1},
		{"other draft", Candidate{Item: entity.OperatorWorkItem{Kind: "risk_draft"}, OwnerID: &other}, 0},
		{"personal report", Candidate{Item: entity.OperatorWorkItem{Kind: "mitigation_report", DueDate: "2026-10-05"}, OwnerID: &actor, PeriodEnd: "2026-09-30"}, 1},
		{"unit report", Candidate{Item: entity.OperatorWorkItem{Kind: "mitigation_report", DueDate: "2026-10-05"}, PeriodEnd: "2026-09-30"}, 1},
		{"other report", Candidate{Item: entity.OperatorWorkItem{Kind: "mitigation_report", DueDate: "2026-10-05"}, OwnerID: &other, PeriodEnd: "2026-09-30"}, 0},
		{"future report", Candidate{Item: entity.OperatorWorkItem{Kind: "mitigation_report", DueDate: "2027-01-05"}, PeriodEnd: "2026-12-31"}, 0},
		{"current monitoring previous final", Candidate{Item: entity.OperatorWorkItem{Kind: "monitoring_start", Period: "2026-Q4"}, EffectiveCycle: "2026-Q2", PreviousStatus: "final"}, 1},
		{"current monitoring previous missing", Candidate{Item: entity.OperatorWorkItem{Kind: "monitoring_start", Period: "2026-Q4"}, EffectiveCycle: "2026-Q2"}, 0},
		{"new current risk", Candidate{Item: entity.OperatorWorkItem{Kind: "monitoring_start", Period: "2026-Q4"}, EffectiveCycle: "2026-Q4"}, 1},
		{"previous draft blocks start", Candidate{Item: entity.OperatorWorkItem{Kind: "monitoring_start", Period: "2026-Q3"}, EffectiveCycle: "2026-Q2", PreviousStatus: "draft"}, 0},
		{"unit monitoring draft", Candidate{Item: entity.OperatorWorkItem{Kind: "monitoring_draft", Period: "2026-Q3"}, OwnerID: &other}, 1},
		{"before effective", Candidate{Item: entity.OperatorWorkItem{Kind: "monitoring_start", Period: "2026-Q3"}, EffectiveCycle: "2026-Q4"}, 0},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildItems([]Candidate{tt.candidate}, actor, now)
			if len(got) != tt.want {
				t.Fatalf("got %d items want %d", len(got), tt.want)
			}
		})
	}
}

func TestBuildItemsDeduplicatesAndOrders(t *testing.T) {
	actor := uuid.New()
	now := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	items := BuildItems([]Candidate{
		{Item: entity.OperatorWorkItem{Key: "draft", Kind: "risk_draft"}, OwnerID: &actor},
		{Item: entity.OperatorWorkItem{Key: "late", Kind: "mitigation_report", DueDate: "2026-09-05"}, PeriodEnd: "2026-08-31"},
		{Item: entity.OperatorWorkItem{Key: "late", Kind: "mitigation_report", DueDate: "2026-09-05"}, PeriodEnd: "2026-08-31"},
	}, actor, now)
	if len(items) != 2 || items[0].Key != "late" {
		t.Fatalf("unexpected items: %#v", items)
	}
}

func TestCurrentQuarterOpensOnlyInThirdMonthJakarta(t *testing.T) {
	c := Candidate{Item: entity.OperatorWorkItem{Key: "q4", Kind: "monitoring_start", Period: "2026-Q4"}, EffectiveCycle: "2026-Q4"}
	for _, tt := range []struct {
		at   string
		want int
	}{{"2026-11-30T16:59:59Z", 0}, {"2026-11-30T17:00:00Z", 1}} {
		t.Run(tt.at, func(t *testing.T) {
			at, err := time.Parse(time.RFC3339, tt.at)
			if err != nil {
				t.Fatal(err)
			}
			if n := len(BuildItems([]Candidate{c}, uuid.New(), at)); n != tt.want {
				t.Fatalf("got %d want %d", n, tt.want)
			}
		})
	}
}
