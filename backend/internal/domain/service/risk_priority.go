package service

import "strings"

// CategoryOrderMap maps risk category to priority order (lower = higher priority).
// Per KMK: kebijakan (1) highest priority, fraud_korupsi (6) lowest.
var CategoryOrderMap = map[string]int{
	"kebijakan":     1,
	"operasional":   2,
	"kepatuhan":     3,
	"reputasi":      4,
	"legal":         5,
	"fraud_korupsi": 6,
}

// GetCategoryOrder returns the priority order for a category (1=highest, 6=lowest).
// Returns 6 (lowest) if category is unknown.
func GetCategoryOrder(category string) int {
	if order, ok := CategoryOrderMap[strings.ToLower(category)]; ok {
		return order
	}
	return 6 // default to lowest priority for unknown categories
}

// CalculatePrioritySortValue computes a sort value for risk prioritization.
// Higher values = higher priority.
//
// CalculatePrioritySortValue computes a sort value for risk prioritization.
// Higher values = higher priority.
//
// Formula: (nilai * 10000) + (impactLevel * 100)
//
// - Primary sort: nilai (higher = more urgent)
// - Tie-breaker: impactLevel (higher = more urgent)
//
// Example:
//   - Risk A: nilai=25, impact=4 → (25*10000)+(4*100) = 250400
//   - Risk B: nilai=25, impact=5 → (25*10000)+(5*100) = 250500
//   - B wins: 250500 > 250400 (higher impact)
//
// Category order from plan: "Tie-breaker: pakai impact level, bukan bobot"
// Category order not used in priority sort — only impact level matters for tie-breaking.
func CalculatePrioritySortValue(nilai float64, impactLevel int, _ int) float64 {
	return (nilai * 10000) + float64(impactLevel*100)
}

// PrioritySortValueDesc returns true if risk A should come before risk B.
// Only considers nilai and impactLevel — categoryOrder is ignored.
func PrioritySortValueDesc(aNilai float64, aImpact int, _ int, bNilai float64, bImpact int, _ int) bool {
	aVal := CalculatePrioritySortValue(aNilai, aImpact, 0)
	bVal := CalculatePrioritySortValue(bNilai, bImpact, 0)
	return aVal > bVal
}