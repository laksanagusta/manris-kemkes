package entity

// RiskCycleComparisonItem represents one risk comparison across two cycles.
type RiskCycleComparisonItem struct {
	VersionGroupID string `json:"versionGroupId"`
	Code           string `json:"code"`
	Title          string `json:"title"`
	OrgName        string `json:"orgName"`
	FromCycle      string `json:"fromCycle"`
	ToCycle        string `json:"toCycle"`
	PreviousScore  int    `json:"previousScore"`
	CurrentScore   int    `json:"currentScore"`
	PreviousLevel  string `json:"previousLevel"`
	CurrentLevel   string `json:"currentLevel"`
	ScoreDelta     int    `json:"scoreDelta"`
	Movement       string `json:"movement"`
	ChangeReason   string `json:"changeReason,omitempty"`
}
