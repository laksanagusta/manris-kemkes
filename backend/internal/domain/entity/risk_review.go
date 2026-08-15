package entity

// RiskReviewQueueItem represents a current risk and its reassessment progress for a cycle.
type RiskReviewQueueItem struct {
	RiskID           string  `json:"riskId"`
	VersionGroupID   string  `json:"versionGroupId"`
	Code             string  `json:"code"`
	Title            string  `json:"title"`
	OrgName          string  `json:"orgName"`
	CurrentStatus    string  `json:"currentStatus"`
	ReviewStatus     string  `json:"reviewStatus"`
	AssessmentCycle  string  `json:"assessmentCycle"`
	CurrentScore     int     `json:"currentScore"`
	CurrentLevel     string  `json:"currentLevel"`
	MonitoringID     *string `json:"monitoringId,omitempty"`
	CandidateRiskID  *string `json:"candidateRiskId,omitempty"`
	CandidateStatus  *string `json:"candidateStatus,omitempty"`
	CandidateScore   *int    `json:"candidateScore,omitempty"`
	CandidateLevel   *string `json:"candidateLevel,omitempty"`
	NextReviewDate   *string `json:"nextReviewDate,omitempty"`
	ChangeReason     string  `json:"changeReason,omitempty"`
	ReviewSummary    string  `json:"reviewSummary,omitempty"`
	CandidateUpdated *string `json:"candidateUpdatedAt,omitempty"`
}
