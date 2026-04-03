package entity

// RiskFieldDiff captures one before/after field change in a risk report.
type RiskFieldDiff struct {
	Field      string `json:"field"`
	Label      string `json:"label"`
	Before     any    `json:"before,omitempty"`
	After      any    `json:"after,omitempty"`
	ChangeType string `json:"changeType"`
}

// RiskMitigationDiff captures one mitigation-row change within a risk report.
type RiskMitigationDiff struct {
	RowKey      string           `json:"rowKey"`
	ChangeType  string           `json:"changeType"`
	FieldDiffs  []*RiskFieldDiff `json:"fieldDiffs"`
	BeforeLabel string           `json:"beforeLabel,omitempty"`
	AfterLabel  string           `json:"afterLabel,omitempty"`
}

// RiskCycleSideBySideSnapshot stores core risk fields for side-by-side exports.
type RiskCycleSideBySideSnapshot struct {
	Category          string   `json:"category,omitempty"`
	Description       string   `json:"description,omitempty"`
	Cause             []string `json:"cause,omitempty"`
	ExistingControl   string   `json:"existingControl,omitempty"`
	Probability       int      `json:"probability,omitempty"`
	Impact            int      `json:"impact,omitempty"`
	InherentScore     int      `json:"inherentScore,omitempty"`
	RiskPriority      int      `json:"riskPriority,omitempty"`
	TreatmentOption   string   `json:"treatmentOption,omitempty"`
	TargetProbability int      `json:"targetProbability,omitempty"`
	TargetImpact      int      `json:"targetImpact,omitempty"`
	TargetScore       int      `json:"targetScore,omitempty"`
	NextReviewDate    string   `json:"nextReviewDate,omitempty"`
	Mitigations       []string `json:"mitigations,omitempty"`
}

// RiskCycleDetailedComparisonItem represents one risk row in a detailed cycle diff report.
type RiskCycleDetailedComparisonItem struct {
	ChangeCategory  string                       `json:"changeCategory"`
	VersionGroupID  string                       `json:"versionGroupId"`
	Code            string                       `json:"code"`
	Title           string                       `json:"title"`
	OrgName         string                       `json:"orgName"`
	FromCycle       string                       `json:"fromCycle"`
	ToCycle         string                       `json:"toCycle"`
	FromRiskID      string                       `json:"fromRiskId,omitempty"`
	ToRiskID        string                       `json:"toRiskId,omitempty"`
	FromSnapshot    *RiskCycleSideBySideSnapshot `json:"fromSnapshot,omitempty"`
	ToSnapshot      *RiskCycleSideBySideSnapshot `json:"toSnapshot,omitempty"`
	FieldDiffs      []*RiskFieldDiff             `json:"fieldDiffs"`
	MitigationDiffs []*RiskMitigationDiff        `json:"mitigationDiffs"`
	ChangeReason    string                       `json:"changeReason,omitempty"`
	ReviewSummary   string                       `json:"reviewSummary,omitempty"`
}

// RiskCycleDetailedComparisonSummary aggregates counts for a detailed cycle diff report.
type RiskCycleDetailedComparisonSummary struct {
	FromCycle    string `json:"fromCycle"`
	ToCycle      string `json:"toCycle"`
	TotalFrom    int    `json:"totalFrom"`
	TotalTo      int    `json:"totalTo"`
	AddedCount   int    `json:"addedCount"`
	RemovedCount int    `json:"removedCount"`
	ChangedCount int    `json:"changedCount"`
	StableCount  int    `json:"stableCount"`
}

// RiskCycleDetailedComparisonReport is the API payload for the detailed diff report.
type RiskCycleDetailedComparisonReport struct {
	Summary *RiskCycleDetailedComparisonSummary `json:"summary"`
	Items   []*RiskCycleDetailedComparisonItem  `json:"items"`
}
