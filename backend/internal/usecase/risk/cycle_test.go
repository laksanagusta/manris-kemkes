package risk

import "testing"

func TestCycleIndexAcceptsSemestersOnly(t *testing.T) {
	tests := []struct {
		cycle   string
		want    int
		wantErr bool
	}{
		{cycle: "2026-H1", want: 4052},
		{cycle: "2026-H2", want: 4053},
		{cycle: "2027-H1", want: 4054},
		{cycle: "2026-Q1", wantErr: true},
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

func TestCompareCyclesUsesSemesterOrder(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{a: "2026-H1", b: "2026-H1", want: 0},
		{a: "2026-H2", b: "2026-H1", want: 1},
		{a: "2026-H2", b: "2027-H1", want: -1},
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

func TestIsValidCycleFormatAcceptsSemestersOnly(t *testing.T) {
	for _, cycle := range []string{"2026-H1", "2026-H2"} {
		if !IsValidCycleFormat(cycle) {
			t.Fatalf("expected %q to be valid", cycle)
		}
	}
	for _, cycle := range []string{"2026-Q1", "2026-Q4", "2026-H3", ""} {
		if IsValidCycleFormat(cycle) {
			t.Fatalf("expected %q to be invalid", cycle)
		}
	}
}

func TestNextSemesterCycle(t *testing.T) {
	tests := map[string]string{
		"2026-H1": "2026-H2",
		"2026-H2": "2027-H1",
	}
	for input, want := range tests {
		got, err := NextSemesterCycle(input)
		if err != nil {
			t.Fatalf("NextSemesterCycle(%q) error = %v", input, err)
		}
		if got != want {
			t.Fatalf("NextSemesterCycle(%q) = %q, want %q", input, got, want)
		}
	}
	if _, err := NextSemesterCycle("2026-Q4"); err == nil {
		t.Fatal("expected quarter cycle to be rejected")
	}
}
