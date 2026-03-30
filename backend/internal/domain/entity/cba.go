package entity

// CBAVariableCategory represents the 3 categories of CBA variables
type CBAVariableCategory string

const (
	CBAVariableCategoryMedis        CBAVariableCategory = "biaya_medis"
	CBAVariableCategoryOperasional  CBAVariableCategory = "biaya_operasional"
	CBAVariableCategoryProduktivitas CBAVariableCategory = "biaya_produktivitas"
)

// CBAVariable represents a single cost variable in CBA analysis
type CBAVariable struct {
	Name           string              `json:"name"`
	Category       CBAVariableCategory `json:"category"`
	Unit           string              `json:"unit"`
	MultiplierType string              `json:"multiplierType"` // "per_case", "per_population", or "fixed"
	Value          float64             `json:"value"`
	Description    string              `json:"description"`
	Source         string              `json:"source"`
}

// CBARecommendation represents the AI-generated variable recommendations
type CBARecommendation struct {
	BiayaMedis         []CBAVariable `json:"biayaMedis"`
	BiayaOperasional   []CBAVariable `json:"biayaOperasional"`
	BiayaProduktivitas []CBAVariable `json:"biayaProduktivitas"`
	BiayaIntervensi    []CBAVariable `json:"biayaIntervensi"`
}

// CBAVariableInput represents a single variable with its user-provided value
type CBAVariableInput struct {
	Name           string              `json:"name"`
	Category       CBAVariableCategory `json:"category"`
	Unit           string              `json:"unit"`
	MultiplierType string              `json:"multiplierType"`
	Value          float64             `json:"value"`
}

// CBACalculationInput represents the full input for CBA calculation
type CBACalculationInput struct {
	RiskDescription    string             `json:"riskDescription"`
	Population         float64            `json:"population"`
	CaseCount          float64            `json:"caseCount"`
	ProgramEffectivity float64            `json:"programEffectivity"` // 0-100 percentage
	PopulationCoverage float64            `json:"populationCoverage"` // 0-100 percentage
	CostOfInactionVars []CBAVariableInput `json:"costOfInactionVars"`
	CostOfActionVars   []CBAVariableInput `json:"costOfActionVars"`
}

// CBACalculationResult represents the output of CBA calculation
type CBACalculationResult struct {
	CostOfInaction   float64                `json:"costOfInaction"`
	CostOfAction     float64                `json:"costOfAction"`
	NetBenefit       float64                `json:"netBenefit"`
	ROI              float64                `json:"roi"`              // percentage
	BenefitCostRatio float64                `json:"benefitCostRatio"`
	IsPositive       bool                   `json:"isPositive"`
	Breakdown        CBACalculationBreakdown `json:"breakdown"`
}

// CBACalculationBreakdown provides detailed breakdown per category
type CBACalculationBreakdown struct {
	InactionByCategory map[string]float64 `json:"inactionByCategory"`
	ActionByCategory   map[string]float64 `json:"actionByCategory"`
}
