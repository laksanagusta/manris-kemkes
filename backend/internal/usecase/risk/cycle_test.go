package risk

import "testing"

func TestCycleIndexAcceptsQuarterlyCycles(t *testing.T) {
	tests := []struct {
		cycle   string
		want    int
		wantErr bool
	}{
		{cycle: "2026-Q1", want: 8104},
		{cycle: "2026-Q2", want: 8105},
		{cycle: "2026-Q4", want: 8107},
		{cycle: "2027-Q1", want: 8108},
		{cycle: "2026-H3", wantErr: true},
		{cycle: "", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.cycle, func(t *testing.T) {
			got, err := CycleIndex(tt.cycle)
			if (err != nil) != tt.wantErr {
				t.Fatalf("CycleIndex() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && got != tt.want {
				t.Fatalf("CycleIndex() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestCompareCyclesUsesQuarterOrder(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{a: "2026-Q2", b: "2026-Q2", want: 0},
		{a: "2026-Q4", b: "2026-Q2", want: 1},
		{a: "2026-Q4", b: "2027-Q1", want: -1},
	}
	for _, tt := range tests {
		got, err := CompareCycles(tt.a, tt.b)
		if err != nil {
			t.Fatalf("CompareCycles() error = %v", err)
		}
		if got != tt.want {
			t.Fatalf("CompareCycles(%q, %q) = %d, want %d", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestIsValidCycleFormatAcceptsQuarterlyCycles(t *testing.T) {
	for _, cycle := range []string{"2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"} {
		if !IsValidCycleFormat(cycle) {
			t.Fatalf("expected %q to be valid", cycle)
		}
	}
	for _, cycle := range []string{"2026-H1", "2026-H3", "", "2026-Q5"} {
		if IsValidCycleFormat(cycle) {
			t.Fatalf("expected %q to be invalid", cycle)
		}
	}
}

func TestNextQuarterCycle(t *testing.T) {
	tests := map[string]string{
		"2026-Q1": "2026-Q2",
		"2026-Q4": "2027-Q1",
	}
	for input, want := range tests {
		got, err := NextQuarterCycle(input)
		if err != nil {
			t.Fatalf("NextQuarterCycle(%q) error = %v", input, err)
		}
		if got != want {
			t.Fatalf("NextQuarterCycle(%q) = %q, want %q", input, got, want)
		}
	}
	if _, err := NextQuarterCycle("2026-H1"); err == nil {
		t.Fatal("expected semester cycle to be rejected")
	}
}
