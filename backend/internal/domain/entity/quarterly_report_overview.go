package entity

import "time"

// QuarterlyReportOverview contains the aggregate data needed for the report
// dashboard without sending risk rows until a detail view requests them.
type QuarterlyReportOverview struct {
	Cycle           string                        `json:"cycle"`
	ComparisonCycle string                        `json:"comparisonCycle"`
	GeneratedAt     time.Time                     `json:"generatedAt"`
	DataUpdatedAt   *time.Time                    `json:"dataUpdatedAt"`
	SnapshotHash    string                        `json:"snapshotHash"`
	Warnings        []string                      `json:"warnings"`
	Summary         QuarterlyEvaluationSummary    `json:"summary"`
	PreviousSummary QuarterlyEvaluationSummary    `json:"previousSummary"`
	Movement        QuarterlyRiskMovementSummary  `json:"movement"`
	HasRisks        bool                          `json:"hasRisks"`
	TaskCounts      QuarterlyTaskStateCounts      `json:"taskCounts"`
	RecentEvents    []QuarterlyReportEventPreview `json:"recentEvents"`
	SeverityCounts  QuarterlyEventSeverityCounts  `json:"severityCounts"`
	Units           []QuarterlyReportUnitOverview `json:"units"`
}

type QuarterlyEvaluationSummary struct {
	Total             int                        `json:"total"`
	Appetite          QuarterlyAppetiteSummary   `json:"appetite"`
	Target            QuarterlyTargetSummary     `json:"target"`
	Monitoring        QuarterlyMonitoringSummary `json:"monitoring"`
	Mitigation        QuarterlyMitigationSummary `json:"mitigation"`
	Events            QuarterlyEventSummary      `json:"events"`
	TargetsAvailable  int                        `json:"targetsAvailable"`
	EvidenceAvailable int                        `json:"evidenceAvailable"`
}

type QuarterlyAppetiteSummary struct {
	Above int      `json:"above"`
	Total int      `json:"total"`
	Rate  *float64 `json:"rate"`
}

type QuarterlyTargetSummary struct {
	Achieved    int      `json:"achieved"`
	Eligible    int      `json:"eligible"`
	Unavailable int      `json:"unavailable"`
	Rate        *float64 `json:"rate"`
}

type QuarterlyMonitoringSummary struct {
	Final int      `json:"final"`
	Total int      `json:"total"`
	Rate  *float64 `json:"rate"`
}

type QuarterlyMitigationSummary struct {
	Reported int      `json:"reported"`
	Total    int      `json:"total"`
	Rate     *float64 `json:"rate"`
	Overdue  int      `json:"overdue"`
}

type QuarterlyEventSummary struct {
	Total          int     `json:"total"`
	KnownLoss      float64 `json:"knownLoss"`
	KnownLossCount int     `json:"knownLossCount"`
	UnknownLoss    int     `json:"unknownLoss"`
	Unlinked       int     `json:"unlinked"`
}

type QuarterlyRiskMovementSummary struct {
	Up     int `json:"up"`
	Down   int `json:"down"`
	Stable int `json:"stable"`
	New    int `json:"new"`
	Absent int `json:"absent"`
}

type QuarterlyTaskStateCounts struct {
	Reported    int `json:"reported"`
	Pending     int `json:"pending"`
	Overdue     int `json:"overdue"`
	NotReported int `json:"not_reported"`
	Skipped     int `json:"skipped"`
	Total       int `json:"total"`
}

type QuarterlyEventSeverityCounts struct {
	Low     int `json:"low"`
	Medium  int `json:"medium"`
	High    int `json:"high"`
	Extreme int `json:"extreme"`
}

type QuarterlyReportEventPreview struct {
	ID                    string    `json:"id"`
	Code                  string    `json:"code"`
	Description           string    `json:"description"`
	OccurredAt            time.Time `json:"occurredAt"`
	OrganizationName      string    `json:"organizationName"`
	PostResponseCondition string    `json:"postResponseCondition"`
	Severity              string    `json:"severity"`
}

type QuarterlyReportUnitOverview struct {
	ID             string                     `json:"id"`
	Name           string                     `json:"name"`
	HasData        bool                       `json:"hasData"`
	AttentionCount int                        `json:"attentionCount"`
	Summary        QuarterlyEvaluationSummary `json:"summary"`
}
