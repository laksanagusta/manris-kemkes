package entity

import (
	"testing"
	"time"
)

func TestMonitoringRuleValidation(t *testing.T) {
	valid := func() MonitoringRule {
		return MonitoringRule{Name: "Tahun berjalan", Year: 2028, Frequency: "semester", Active: true, Periods: []MonitoringRulePeriod{{Ordinal: 1, Label: "Semester I", OpensOn: "2028-02-29", ClosesOn: "2028-06-30"}, {Ordinal: 2, Label: "Semester II", OpensOn: "2028-07-01", ClosesOn: "2029-01-31"}}}
	}
	cases := []struct {
		name    string
		change  func(*MonitoringRule)
		wantErr bool
	}{
		{"leap date and next year", func(r *MonitoringRule) {}, false},
		{"invalid leap date", func(r *MonitoringRule) { r.Periods[0].OpensOn = "2027-02-29" }, true},
		{"inclusive overlap", func(r *MonitoringRule) { r.Periods[1].OpensOn = "2028-06-30" }, true},
		{"wrong period count", func(r *MonitoringRule) { r.Frequency = "quarterly" }, true},
		{"duplicate ordinal", func(r *MonitoringRule) { r.Periods[1].Ordinal = 1 }, true},
		{"reversed dates", func(r *MonitoringRule) { r.Periods[0].ClosesOn = "2028-02-28" }, true},
		{"earlier year", func(r *MonitoringRule) { r.Periods[0].OpensOn = "2027-12-31" }, true},
		{"beyond next year", func(r *MonitoringRule) { r.Periods[1].ClosesOn = "2030-01-01" }, true},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			r := valid()
			tt.change(&r)
			if err := r.Validate(); (err != nil) != tt.wantErr {
				t.Fatalf("Validate()=%v wantErr=%v", err, tt.wantErr)
			}
		})
	}
}
func TestMonitoringRulePeriodJakartaInclusive(t *testing.T) {
	p := MonitoringRulePeriod{OpensOn: "2028-02-29", ClosesOn: "2028-03-01"}
	for _, tt := range []struct {
		at   string
		open bool
	}{{"2028-02-28T16:59:59Z", false}, {"2028-02-28T17:00:00Z", true}, {"2028-03-01T16:59:59Z", true}, {"2028-03-01T17:00:00Z", false}} {
		t.Run(tt.at, func(t *testing.T) {
			at, _ := time.Parse(time.RFC3339, tt.at)
			if got := p.IsOpen(at); got != tt.open {
				t.Fatalf("IsOpen=%v want=%v", got, tt.open)
			}
		})
	}
}

func TestMonitoringPeriodCalendarBounds(t *testing.T) {
	for _, tt := range []struct {
		name, frequency string
		year, ordinal   int
		start, end      string
	}{{"leap February", "monthly", 2028, 2, "2028-02-01", "2028-02-29"}, {"Q1 reported in April", "quarterly", 2026, 1, "2026-01-01", "2026-03-31"}, {"second semester", "semester", 2026, 2, "2026-07-01", "2026-12-31"}} {
		t.Run(tt.name, func(t *testing.T) {
			start, end, err := MonitoringPeriodCalendarBounds(tt.year, tt.frequency, tt.ordinal)
			if err != nil || start.Format(time.DateOnly) != tt.start || end.Format(time.DateOnly) != tt.end {
				t.Fatalf("bounds=%v %v %v", start, end, err)
			}
		})
	}
}
