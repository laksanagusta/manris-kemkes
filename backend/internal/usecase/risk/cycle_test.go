package risk

import "testing"

func TestCycleIndex(t *testing.T) {
	tests := []struct {
		name    string
		cycle   string
		want    int
		wantErr bool
	}{
		{name: "valid Q1", cycle: "2026-Q1", want: 8104},
		{name: "valid Q2", cycle: "2026-Q2", want: 8105},
		{name: "valid Q3", cycle: "2026-Q3", want: 8106},
		{name: "valid Q4", cycle: "2026-Q4", want: 8107},
		{name: "valid H1", cycle: "2026-H1", want: 8105},
		{name: "valid H2", cycle: "2026-H2", want: 8107},
		{name: "invalid quarter Q5", cycle: "2026-Q5", wantErr: true},
		{name: "invalid half H3", cycle: "2026-H3", wantErr: true},
		{name: "invalid year", cycle: "abcd-Q1", wantErr: true},
		{name: "empty", cycle: "", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
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

func TestCompareCycles(t *testing.T) {
	tests := []struct {
		name string
		a    string
		b    string
		want int
	}{
		{name: "same Q", a: "2026-Q1", b: "2026-Q1", want: 0},
		{name: "same H", a: "2026-H1", b: "2026-H1", want: 0},
		{name: "later quarter", a: "2026-Q2", b: "2026-Q1", want: 1},
		{name: "earlier year", a: "2025-Q4", b: "2026-Q1", want: -1},
		{name: "Q4 vs Q1 next year", a: "2026-Q4", b: "2027-Q1", want: -1},
		{name: "H1 vs H2", a: "2026-H1", b: "2026-H2", want: -1},
		{name: "mixed Q2 vs H1 same year", a: "2026-Q2", b: "2026-H1", want: 0},
		{name: "mixed H1 vs Q1", a: "2026-H1", b: "2026-Q1", want: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CompareCycles(tt.a, tt.b)
			if err != nil {
				t.Fatalf("CompareCycles() unexpected error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("CompareCycles() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestIsValidCycleFormat(t *testing.T) {
	tests := []struct {
		cycle string
		want  bool
	}{
		{"2026-Q1", true},
		{"2026-Q4", true},
		{"2025-Q3", true},
		{"2026-Q5", false},
		{"2026-Q0", false},
		{"2026-H1", false},
		{"2026-Q01", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.cycle, func(t *testing.T) {
			if got := IsValidCycleFormat(tt.cycle); got != tt.want {
				t.Fatalf("IsValidCycleFormat(%q) = %v, want %v", tt.cycle, got, tt.want)
			}
		})
	}
}

func TestIsValidSemesterFormat(t *testing.T) {
	tests := []struct {
		cycle string
		want  bool
	}{
		{"2026-H1", true},
		{"2026-H2", true},
		{"2025-H1", true},
		{"2026-H3", false},
		{"2026-Q1", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.cycle, func(t *testing.T) {
			if got := IsValidSemesterFormat(tt.cycle); got != tt.want {
				t.Fatalf("IsValidSemesterFormat(%q) = %v, want %v", tt.cycle, got, tt.want)
			}
		})
	}
}

func TestSemesterToTargetQuarter(t *testing.T) {
	tests := []struct {
		semester string
		want     string
		wantErr  bool
	}{
		{"2026-H1", "2026-Q2", false},
		{"2026-H2", "2026-Q4", false},
		{"2025-H1", "2025-Q2", false},
		{"2025-H2", "2025-Q4", false},
		{"2026-H3", "", true},
		{"2026-Q1", "", true},
		{"", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.semester, func(t *testing.T) {
			got, err := SemesterToTargetQuarter(tt.semester)
			if (err != nil) != tt.wantErr {
				t.Fatalf("SemesterToTargetQuarter(%q) error = %v, wantErr %v", tt.semester, err, tt.wantErr)
			}
			if err == nil && got != tt.want {
				t.Fatalf("SemesterToTargetQuarter(%q) = %q, want %q", tt.semester, got, tt.want)
			}
		})
	}
}

func TestQuarterToAssessmentSemester(t *testing.T) {
	tests := []struct {
		quarter string
		want    string
		wantErr bool
	}{
		{"2026-Q1", "2026-H1", false},
		{"2026-Q2", "2026-H1", false},
		{"2026-Q3", "2026-H2", false},
		{"2026-Q4", "2026-H2", false},
		{"2026-H1", "", true},
		{"", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.quarter, func(t *testing.T) {
			got, err := QuarterToAssessmentSemester(tt.quarter)
			if (err != nil) != tt.wantErr {
				t.Fatalf("QuarterToAssessmentSemester(%q) error = %v, wantErr %v", tt.quarter, err, tt.wantErr)
			}
			if err == nil && got != tt.want {
				t.Fatalf("QuarterToAssessmentSemester(%q) = %q, want %q", tt.quarter, got, tt.want)
			}
		})
	}
}
