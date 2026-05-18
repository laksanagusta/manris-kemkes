package entity

import "time"

// RiskDetailPDFData aggregates the final stored risk data needed by the PDF renderer.
type RiskDetailPDFData struct {
	Title                string
	Code                 string
	Status               string
	OrganizationName     string
	CategoryLabel        string
	RiskSource           string
	Controllability      string
	AssessmentCycle      string
	Description          string
	Causes               []string
	Impacts              []string
	ExistingControl      string
	ControlEffectiveness string
	Probability          int
	Impact               int
	Weight               float64
	Nilai                float64
	InherentScore        int
	RiskLevelLabel       string
	RiskPriority         int
	RiskAppetite         string
	IsRiskUtamaLabel     string
	TreatmentOption      string
	ReviewSummary        string
	TargetProbability    int
	TargetImpact         int
	TargetWeight         float64
	TargetNilai          float64
	Mitigations          []Mitigation
	CreatedByName        string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
