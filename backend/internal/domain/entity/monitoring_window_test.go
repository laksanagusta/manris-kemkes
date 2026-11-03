package entity

import (
	"testing"
	"time"
)

func TestMonitoringWindowJakarta(t *testing.T) {
	for _, tt := range []struct {
		cycle, at string
		want      bool
	}{
		{"2026-Q3", "2026-09-30T16:59:59Z", false},
		{"2026-Q3", "2026-09-30T17:00:00Z", true},
		{"2026-Q3", "2026-10-31T16:59:59Z", true},
		{"2026-Q3", "2026-10-31T17:00:00Z", false},
		{"2026-Q3", "2026-12-15T00:00:00Z", false},
		{"2026-Q4", "2026-12-31T17:00:00Z", true},
		{"2026-Q4", "2027-01-31T17:00:00Z", false},
		{"2026-Q1", "2026-04-15T00:00:00Z", true},
		{"2026-Q2", "2026-07-15T00:00:00Z", true},
		{"2026-Q5", "2026-07-15T00:00:00Z", false},
	} {
		t.Run(tt.cycle+tt.at, func(t *testing.T) {
			now, _ := time.Parse(time.RFC3339, tt.at)
			if got := MonitoringWindowOpen(tt.cycle, now); got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}
