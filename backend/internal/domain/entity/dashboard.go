package entity

// DashboardSummary holds KPI card data for the dashboard
type DashboardSummary struct {
	TotalRisks     int `json:"totalRisks"`
	HighExtreme    int `json:"highExtreme"`
	OverdueMitig   int `json:"overdueMitigations"`
	IncidentsMonth int `json:"incidentsThisMonth"`
}

// HeatmapCell represents a single cell in the 5x5 risk heatmap
type HeatmapCell struct {
	Probability int `json:"probability"`
	Impact      int `json:"impact"`
	Count       int `json:"count"`
}
