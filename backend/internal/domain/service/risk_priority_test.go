package service

import (
	"testing"
)

func TestGetCategoryOrder(t *testing.T) {
	tests := []struct {
		name     string
		category string
		want     int
	}{
		{"kebijakan", "kebijakan", 1},
		{"operasional", "operasional", 2},
		{"kepatuhan", "kepatuhan", 3},
		{"reputasi", "reputasi", 4},
		{"legal", "legal", 5},
		{"fraud_korupsi", "fraud_korupsi", 6},
		{"unknown", "foo", 6},
		{"empty", "", 6},
		{"case insensitive", "KEBIJAKAN", 1},
		{"case mixed", "Operasional", 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetCategoryOrder(tt.category)
			if got != tt.want {
				t.Errorf("GetCategoryOrder(%q) = %d, want %d", tt.category, got, tt.want)
			}
		})
	}
}

func TestCalculatePrioritySortValue(t *testing.T) {
	tests := []struct {
		name        string
		nilai       float64
		impactLevel int
		catOrder    int // ignored in formula
		want        float64
	}{
		{"kebijakan high nilai", 25, 4, 1, 250400},
		{"operasional same nilai", 25, 5, 2, 250500},
		{"fraud_korupsi low priority", 25, 3, 6, 250300},
		{"low nilai", 5, 3, 1, 50300},
		{"zero nilai kebijakan", 0, 1, 1, 100},
		{"zero nilai fraud", 0, 1, 6, 100},
		{"high impact wins same nilai", 20, 5, 1, 200500},
		{"lower impact loses same nilai", 20, 3, 1, 200300},
		{"same nilai+impact kebijakan vs operasional", 30, 4, 1, 300400},
		{"same nilai+impact category not used", 30, 4, 2, 300400},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculatePrioritySortValue(tt.nilai, tt.impactLevel, tt.catOrder)
			if got != tt.want {
				t.Errorf("CalculatePrioritySortValue(%.0f, %d, %d) = %.0f, want %.0f",
					tt.nilai, tt.impactLevel, tt.catOrder, got, tt.want)
			}
		})
	}
}

func TestPrioritySortValueDesc(t *testing.T) {
	tests := []struct {
		name    string
		aNilai  float64
		aImpact int
		aCatOrd int
		bNilai  float64
		bImpact int
		bCatOrd int
		want    bool
	}{
		{"A higher nilai", 30, 4, 1, 20, 5, 1, true},
		{"B higher nilai", 20, 5, 1, 30, 4, 1, false},
		{"same nilai, A higher impact", 25, 5, 1, 25, 4, 1, true},
		{"same nilai, B higher impact", 25, 4, 1, 25, 5, 1, false},
		{"same nilai+impact, category ignored", 25, 4, 1, 25, 4, 2, false},
		{"same nilai+impact, category ignored other way", 25, 4, 2, 25, 4, 1, false},
		{"equal", 25, 4, 1, 25, 4, 1, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := PrioritySortValueDesc(tt.aNilai, tt.aImpact, tt.aCatOrd, tt.bNilai, tt.bImpact, tt.bCatOrd)
			if got != tt.want {
				t.Errorf("PrioritySortValueDesc(%.0f,%d,%d, %.0f,%d,%d) = %v, want %v",
					tt.aNilai, tt.aImpact, tt.aCatOrd, tt.bNilai, tt.bImpact, tt.bCatOrd, got, tt.want)
			}
		})
	}
}

func TestCategoryOrderMapComplete(t *testing.T) {
	categories := []string{"kebijakan", "operasional", "kepatuhan", "reputasi", "legal", "fraud_korupsi"}
	for _, cat := range categories {
		order := GetCategoryOrder(cat)
		if order < 1 || order > 6 {
			t.Errorf("GetCategoryOrder(%q) = %d, expected 1-6", cat, order)
		}
	}
}