package entity

import (
	"testing"
)

func TestResolveRiskAppetite(t *testing.T) {
	tests := []struct {
		name          string
		inherentScore int
		want          string
	}{
		{"inherentScore 0", 0, "dalam_batas"},
		{"inherentScore 5", 5, "dalam_batas"},
		{"inherentScore 9", 9, "dalam_batas"},
		{"inherentScore 9.99 rounding", 9, "dalam_batas"},
		{"inherentScore 10", 10, "di_atas_batas"},
		{"inherentScore 12", 12, "di_atas_batas"},
		{"inherentScore 15", 15, "di_atas_batas"},
		{"inherentScore 25", 25, "di_atas_batas"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveRiskAppetite(tt.inherentScore)
			if got != tt.want {
				t.Errorf("ResolveRiskAppetite(%d) = %q, want %q", tt.inherentScore, got, tt.want)
			}
		})
	}
}

func TestRiskIsRiskUtama(t *testing.T) {
	tests := []struct {
		name          string
		inherentScore int
		want          bool
	}{
		{"inherentScore 1", 1, false},
		{"inherentScore 5", 5, false},
		{"inherentScore 9", 9, false},
		{"inherentScore 10", 10, true},
		{"inherentScore 12", 12, true},
		{"inherentScore 15", 15, true},
		{"inherentScore 25", 25, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Risk{Nilai: float64(tt.inherentScore)}
			if got := r.IsRiskUtama(); got != tt.want {
				t.Errorf("Risk.IsRiskUtama() with InherentScore=%d = %v, want %v", tt.inherentScore, got, tt.want)
			}
		})
	}
}

func TestRiskAppetiteDisplay(t *testing.T) {
	tests := []struct {
		name     string
		appetite string
		want     string
	}{
		{"dalam_batas", "dalam_batas", "Dalam batas selera risiko"},
		{"di_atas_batas", "di_atas_batas", "Di atas batas selera risiko"},
		{"unknown", "unknown", "unknown"},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetRiskAppetiteDisplay(tt.appetite)
			if got != tt.want {
				t.Errorf("GetRiskAppetiteDisplay(%q) = %q, want %q", tt.appetite, got, tt.want)
			}
		})
	}
}
