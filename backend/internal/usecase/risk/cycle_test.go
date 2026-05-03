package risk

import "testing"

func TestCycleIndex(t *testing.T) {
	tests := []struct {
		name    string
		cycle   string
		want    int
		wantErr bool
	}{
		{name: "valid H1", cycle: "2026-H1", want: 4052},
		{name: "valid H2", cycle: "2026-H2", want: 4053},
		{name: "invalid half", cycle: "2026-H3", wantErr: true},
		{name: "invalid year", cycle: "abcd-H1", wantErr: true},
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
		{name: "same", a: "2026-H1", b: "2026-H1", want: 0},
		{name: "later half", a: "2026-H2", b: "2026-H1", want: 1},
		{name: "earlier year", a: "2025-H2", b: "2026-H1", want: -1},
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
