package cba

import (
	"context"
	"fmt"

	"github.com/manris/backend/internal/domain/entity"
)

// CalculateInput represents input for CBA calculation
type CalculateInput struct {
	RiskDescription    string
	Population         float64
	CaseCount          float64
	ProgramEffectivity float64 // 0-100 percentage
	PopulationCoverage float64 // 0-100 percentage
	CostOfInactionVars []entity.CBAVariableInput
	CostOfActionVars   []entity.CBAVariableInput
}

// CalculateUseCase handles CBA calculation logic
type CalculateUseCase struct{}

// NewCalculateUseCase creates a new calculate use case
func NewCalculateUseCase() *CalculateUseCase {
	return &CalculateUseCase{}
}

// Execute performs the CBA calculation
func (uc *CalculateUseCase) Execute(ctx context.Context, input CalculateInput) (*entity.CBACalculationResult, error) {
	if len(input.CostOfInactionVars) == 0 {
		return nil, fmt.Errorf("variabel biaya tanpa tindakan wajib diisi")
	}
	if len(input.CostOfActionVars) == 0 {
		return nil, fmt.Errorf("variabel biaya tindakan wajib diisi")
	}

	// Clamp percentages
	effectivity := clamp(input.ProgramEffectivity, 0, 100) / 100.0
	coverage := clamp(input.PopulationCoverage, 0, 100) / 100.0

	// Calculate Cost of Inaction (total potential losses if no action)
	inactionByCategory := make(map[string]float64)
	var totalInaction float64
	for _, v := range input.CostOfInactionVars {
		cat := string(v.Category)
		val := calculateVariableTotal(v, input.Population, input.CaseCount)
		inactionByCategory[cat] += val
		totalInaction += val
	}

	// Calculate Cost of Action (total program cost)
	actionByCategory := make(map[string]float64)
	var totalAction float64
	for _, v := range input.CostOfActionVars {
		cat := string(v.Category)
		val := calculateVariableTotal(v, input.Population, input.CaseCount)
		actionByCategory[cat] += val
		totalAction += val
	}

	// Apply effectivity and coverage adjustments to benefits (averted losses)
	// Net benefit = (Losses averted by intervention) - (Cost of intervention)
	// Losses averted = Cost of Inaction × Effectivity × Coverage
	avertedLoss := totalInaction * effectivity * coverage
	netBenefit := avertedLoss - totalAction

	// ROI = (Net Benefit / Cost of Action) × 100
	var roi float64
	if totalAction > 0 {
		roi = (netBenefit / totalAction) * 100
	}

	// Benefit-Cost Ratio = Averted Losses / Cost of Action
	var bcr float64
	if totalAction > 0 {
		bcr = avertedLoss / totalAction
	}

	return &entity.CBACalculationResult{
		CostOfInaction:   totalInaction,
		CostOfAction:     totalAction,
		NetBenefit:       netBenefit,
		ROI:              roi,
		BenefitCostRatio: bcr,
		IsPositive:       netBenefit > 0,
		Breakdown: entity.CBACalculationBreakdown{
			InactionByCategory: inactionByCategory,
			ActionByCategory:   actionByCategory,
		},
	}, nil
}

func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// calculateVariableTotal multiplies the base value by population or case count if the unit implies per-capita or per-case
func calculateVariableTotal(v entity.CBAVariableInput, pop, cases float64) float64 {
	multiplier := 1.0

	switch v.MultiplierType {
	case "per_case":
		if cases > 0 {
			multiplier = cases
		}
	case "per_population":
		if pop > 0 {
			multiplier = pop
		}
	}

	return v.Value * multiplier
}

