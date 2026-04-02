package ai

import "testing"

func TestNormalizeIncidentSeverity(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "critical alias", input: "kritis", want: "critical"},
		{name: "major alias", input: "tinggi", want: "major"},
		{name: "minor alias", input: "sedang", want: "minor"},
		{name: "insignificant alias", input: "rendah", want: "insignificant"},
		{name: "unknown defaults to minor", input: "tidak-jelas", want: "minor"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeIncidentSeverity(tt.input)
			if got != tt.want {
				t.Fatalf("normalizeIncidentSeverity(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
