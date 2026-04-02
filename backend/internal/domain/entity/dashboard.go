package entity

// DashboardSummary holds KPI card data for the dashboard
type DashboardSummary struct {
	TotalRisks     int `json:"totalRisks"`
	HighExtreme    int `json:"highExtreme"`
	OverdueMitig   int `json:"overdueMitigations"`
	IncidentsMonth int `json:"incidentsThisMonth"`
}

type DashboardActionPressurePoint struct {
	Period               string `json:"period"`
	IncidentsCreated     int    `json:"incidentsCreated"`
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
