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
	HighExtremeCount   int // risks with score >= 15
	OverdueMitigations int
	AvgExposureScore   float64
	CategoryBreakdown  map[string]int
}

// CycleTrendPoint represents risk level counts for a single assessment cycle
type CycleTrendPoint struct {
	Cycle        string
	SangatRendah int // Very Low (score < 5)
	Rendah       int // Low (score 5-9)
	Sedang       int // Medium (score 10-14)
	Tinggi       int // High (score 15-19)
	Ekstrem      int // Extreme (score >= 20)
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

// KMKReportSectionStatus captures the availability of a section in a formal KMK report.
type KMKReportSectionStatus struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	Available bool   `json:"available"`
	Count     int    `json:"count"`
	Note      string `json:"note"`
}

// KMKFormalReportData aggregates the inputs required to render a formal KMK report PDF.
type KMKFormalReportData struct {
	Report                     *FormalReport
	GeneratedAt                time.Time
	Organization               *Organization
	Period                     string
	RiskSummary                ReportSummary
	TMPMR                      *TMPMRAssessment
	SectionStatus              []KMKReportSectionStatus
	AnnualProfile              *AnnualRiskProfileData
	ImplementationReport       *SemiannualImplementationData
	SupervisionReport          *SemiannualSupervisionData
	TMPMRReport                *TMPMRReportData
	MonitoringEvaluationReport *MonitoringEvaluationReportData
}

type AnnualRiskProfileData struct {
	Report        *FormalReport
	Organization  *Organization
	Summary       ReportSummary
	Risks         []*Risk
	TopRisks      []*Risk
	Heatmap       [5][5]int
	PreviousCycle string
}

type SemiannualImplementationData struct {
	Report        *FormalReport
	Organization  *Organization
	Summary       ReportSummary
	SectionStatus []KMKReportSectionStatus
}

type SemiannualSupervisionData struct {
	Report        *FormalReport
	Organization  *Organization
	Summary       ReportSummary
	SectionStatus []KMKReportSectionStatus
}

type TMPMRReportData struct {
	Report       *FormalReport
	Organization *Organization
	Summary      ReportSummary
	TMPMR        *TMPMRAssessment
}

type MonitoringEvaluationReportData struct {
	Report                   *FormalReport
	Organization             *Organization
	Summary                  ReportSummary
	EvaluationStatus         string
	OrganizationName         string
	Year                     string
	SemesterLabel            string
	ReportNumber             string
	ReportDate               string
	AssignmentLetterNumber   string
	AssignmentLetterDate     string
	MonitoringDateRange      string
	UnitCode                 string
	UnitLocation             string
	UnitAddress              string
	UnitEselonI              string
	UnitLeaderName           string
	DocumentChecklist        []MonitoringEvaluationChecklistRow
	DocumentConclusion       string
	InfrastructureChecklist  []MonitoringEvaluationChecklistRow
	InfrastructureConclusion string
	ResultChecklist          []MonitoringEvaluationChecklistRow
	ResultConclusion         string
	MitigationSummary        []MonitoringEvaluationMitigationSummaryRow
	MitigationConclusion     string
}

type MonitoringEvaluationChecklistRow struct {
	No          string
	Item        string
	Yes         bool
	NoChecked   bool
	Condition   string
	Description string
	Analysis    string
}

type MonitoringEvaluationMitigationSummaryRow struct {
	No                         string
	LevelKey                   string
	LevelLabel                 string
	RiskCount                  int
	MitigationPlanCount        int
	MitigationRealizationCount int
	DownCount                  int
	SameCount                  int
	UpCount                    int
	NewCount                   int
	Total                      bool
}
