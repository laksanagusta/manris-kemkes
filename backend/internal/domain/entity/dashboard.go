package entity

// DashboardSummary holds KPI card data for the dashboard
type DashboardSummary struct {
	TotalRisks   int `json:"totalRisks"`
	HighExtreme  int `json:"highExtreme"`
	OverdueMitig int `json:"overdueMitigations"`
}

type DashboardActionPressurePoint struct {
	Period               string `json:"period"`
	TotalMitigations     int    `json:"totalMitigations"`
	MitigationsCompleted int    `json:"mitigationsCompleted"`
	OverdueMitigations   int    `json:"overdueMitigations"`
}

type ExecutiveAlert struct {
	ID       string `json:"id"`
	Category string `json:"category"`
	Severity string `json:"severity"`
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	OrgName  string `json:"orgName,omitempty"`
	RiskCode string `json:"riskCode,omitempty"`
}

// HeatmapCell represents a single cell in the 5x5 risk heatmap
type HeatmapCell struct {
	Probability int `json:"probability"`
	Impact      int `json:"impact"`
	Count       int `json:"count"`
}

// HeatmapMultiPhase holds four 5x5 heatmap matrices for a given year:
// Initial (first assessment/v1), Semester 1, Semester 2, and Target.
// Each matrix is indexed as matrix[probability-1][impact-1] = count.
type HeatmapMultiPhase struct {
	Initial   [5][5]int `json:"initial"`
	Semester1 [5][5]int `json:"semester1"`
	Semester2 [5][5]int `json:"semester2"`
	Target    [5][5]int `json:"target"`
}

// DashboardCategoryCount holds the count of risks per category with severity breakdown
type DashboardCategoryCount struct {
	Category     string `json:"category"`
	Count        int    `json:"count"`
	SangatRendah int    `json:"sangatRendah"`
	Rendah       int    `json:"rendah"`
	Sedang       int    `json:"sedang"`
	Tinggi       int    `json:"tinggi"`
	Ekstrem      int    `json:"ekstrem"`
}

// HeatmapVelocityCell extends HeatmapCell with movement direction counts
type HeatmapVelocityCell struct {
	Probability int `json:"probability"`
	Impact      int `json:"impact"`
	Count       int `json:"count"`
	UpCount     int `json:"upCount"`
	DownCount   int `json:"downCount"`
	StableCount int `json:"stableCount"`
	NewCount    int `json:"newCount"`
}

// OverdueMitigationTimelineItem holds overdue mitigation counts per organization
type OverdueMitigationTimelineItem struct {
	OrgID              string `json:"orgId"`
	OrgName            string `json:"orgName"`
	OnTimeCount        int    `json:"onTimeCount"`
	Overdue7Count      int    `json:"overdue7Count"`
	Overdue30Count     int    `json:"overdue30Count"`
	Overdue30PlusCount int    `json:"overdue30PlusCount"`
	TotalCount         int    `json:"totalCount"`
}

// KRIBreachItem holds a single KRI breach or warning entry
type KRIBreachItem struct {
	KRIID       string  `json:"kriId"`
	KRIName     string  `json:"kriName"`
	Threshold   float64 `json:"threshold"`
	ActualValue float64 `json:"actualValue"`
	Unit        string  `json:"unit"`
	Status      string  `json:"status"`
	RiskTitle   string  `json:"riskTitle"`
	OrgName     string  `json:"orgName"`
}

// UnitResponseTime holds average response metrics per organization
type UnitResponseTime struct {
	OrgID             string  `json:"orgId"`
	OrgName           string  `json:"orgName"`
	AvgMitigationDays float64 `json:"avgMitigationDays"`
	AvgApprovalDays   float64 `json:"avgApprovalDays"`
	TaskCount         int     `json:"taskCount"`
}
