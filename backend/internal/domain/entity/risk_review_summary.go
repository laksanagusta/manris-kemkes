package entity

type RiskReviewUnitCompletion struct {
	OrgName        string  `json:"orgName"`
	TotalAssigned  int     `json:"totalAssigned"`
	Completed      int     `json:"completed"`
	Pending        int     `json:"pending"`
	Overdue        int     `json:"overdue"`
	CompletionRate float64 `json:"completionRate"`
}

type RiskReviewSummary struct {
	Cycle           string                      `json:"cycle"`
	PreviousCycle   string                      `json:"previousCycle"`
	TotalDue        int                         `json:"totalDue"`
	Completed       int                         `json:"completed"`
	PendingApproval int                         `json:"pendingApproval"`
	Overdue         int                         `json:"overdue"`
	InDraft         int                         `json:"inDraft"`
	UnitCompletion  []*RiskReviewUnitCompletion `json:"unitCompletion"`
	PreviousHeatmap []*HeatmapCell              `json:"previousHeatmap"`
	CurrentHeatmap  []*HeatmapCell              `json:"currentHeatmap"`
}
