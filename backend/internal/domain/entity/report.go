package entity

import "time"

// ReportRequest holds parameters for generating a risk report
type ReportRequest struct {
	Cycle string
}

// ReportSummary contains KPI data for the executive summary section
type ReportSummary struct {
	Cycle              string
	GeneratedAt        time.Time
	TotalRisks         int
	HighExtremeCount   int // risks with score >= 10
	OverdueMitigations int
	AvgExposureScore   float64
	CategoryBreakdown  map[string]int
}

// CycleTrendPoint represents risk level counts for a single assessment cycle
type CycleTrendPoint struct {
	Cycle   string
	Rendah  int // Low (score < 5)
	Sedang  int // Medium (score 5-9)
	Tinggi  int // High (score 10-14)
	Ekstrem int // Extreme (score >= 15)
}

// ReportData aggregates all data needed to render the full PDF report
type ReportData struct {
	Summary   ReportSummary
	Heatmap   [5][5]int         // [probability-1][impact-1] = count
	Risks     []*Risk           // All cycle risks, sorted by score desc
	TopRisks  []*Risk           // Top 10 risks by score
	Incidents []*Incident       // Incidents linked to cycle risks
	KRIs      []*KRI            // KRIs linked to cycle risks
	TrendData []CycleTrendPoint // Recent cycles trend data
}
