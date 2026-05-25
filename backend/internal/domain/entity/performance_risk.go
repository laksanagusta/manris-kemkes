package entity

import (
	"time"

	"github.com/google/uuid"
)

type PerformanceRiskAttentionStatus string

const (
	PerformanceRiskAttentionCritical PerformanceRiskAttentionStatus = "critical"
	PerformanceRiskAttentionWatch    PerformanceRiskAttentionStatus = "watch"
	PerformanceRiskAttentionStable   PerformanceRiskAttentionStatus = "stable"
	PerformanceRiskAttentionNoRisk   PerformanceRiskAttentionStatus = "no_risk"
)

type PerformanceRiskFilter struct {
	Period     string
	PlanningID *uuid.UUID
	OrgIDs     []uuid.UUID
}

type PerformanceRiskPlanningNode struct {
	ROID           uuid.UUID `json:"roId"`
	ROTitle        string    `json:"roTitle"`
	ActivityTitle  string    `json:"activityTitle"`
	ProgramTitle   string    `json:"programTitle"`
	IKUTitle       string    `json:"ikuTitle"`
	ObjectiveTitle string    `json:"objectiveTitle"`
	PlanningID     uuid.UUID `json:"planningId"`
	PlanningTitle  string    `json:"planningTitle"`
	PlanningStatus string    `json:"planningStatus"`
	PlanningPeriod string    `json:"planningPeriod"`
	KegiatanTitle  string    `json:"kegiatanTitle,omitempty"`
	SasaranTitle   string    `json:"sasaranTitle,omitempty"`
	TujuanTitle    string    `json:"tujuanTitle,omitempty"`
}

type PerformanceRiskMetrics struct {
	RiskCount                 int                            `json:"riskCount"`
	HighestInherentScore      int                            `json:"highestInherentScore"`
	HighestLevel              string                         `json:"highestLevel"`
	TotalExposure             int                            `json:"totalExposure"`
	AvgExposure               float64                        `json:"avgExposure"`
	HighExtremeCount          int                            `json:"highExtremeCount"`
	Heatmap                   [5][5]int                      `json:"heatmap"`
	MitigationTotal           int                            `json:"mitigationTotal"`
	MitigationPending         int                            `json:"mitigationPending"`
	MitigationOverdue         int                            `json:"mitigationOverdue"`
	MitigationProgressDone    int                            `json:"mitigationProgressDone"`
	MitigationProgressPending int                            `json:"mitigationProgressPending"`
	MitigationProgressOverdue int                            `json:"mitigationProgressOverdue"`
	MitigationProgressTotal   int                            `json:"mitigationProgressTotal"`
	MitigationProgressPercent float64                        `json:"mitigationProgressPercent"`
	AttentionStatus           PerformanceRiskAttentionStatus `json:"attentionStatus"`
}

type PerformanceRiskNode struct {
	PerformanceRiskPlanningNode
	PerformanceRiskMetrics
}

type PerformanceRiskSummary struct {
	Period             string `json:"period"`
	TotalRO            int    `json:"totalRO"`
	LinkedRO           int    `json:"linkedRO"`
	UnlinkedRO         int    `json:"unlinkedRO"`
	HighOrExtremeRO    int    `json:"highOrExtremeRO"`
	TotalRisks         int    `json:"totalRisks"`
	UnlinkedRisks      int    `json:"unlinkedRisks"`
	TotalMitigations   int    `json:"totalMitigations"`
	OverdueMitigations int    `json:"overdueMitigations"`
}

type PerformanceRiskRiskRow struct {
	ID                     uuid.UUID  `json:"id"`
	ROID                   *uuid.UUID `json:"roId,omitempty"`
	Code                   string     `json:"code"`
	Title                  string     `json:"title"`
	OrganizationID         *uuid.UUID `json:"organizationId,omitempty"`
	OrganizationName       string     `json:"organizationName"`
	Probability            int        `json:"probability"`
	Impact                 int        `json:"impact"`
	InherentScore          int        `json:"inherentScore"`
	Category               string     `json:"category"`
	Status                 string     `json:"status"`
	AssessmentCycle        string     `json:"assessmentCycle"`
	MitigationDueDates     []string   `json:"-"`
	MitigationDoneCount    int        `json:"mitigationDoneCount"`
	MitigationPendingCount int        `json:"mitigationPendingCount"`
	MitigationOverdueCount int        `json:"mitigationOverdueCount"`
}

type PerformanceRiskMitigationRow struct {
	ID               uuid.UUID `json:"id"`
	RiskID           uuid.UUID `json:"riskId"`
	RiskCode         string    `json:"riskCode"`
	RiskTitle        string    `json:"riskTitle"`
	Action           string    `json:"action"`
	Owner            string    `json:"owner"`
	DueDate          *string   `json:"dueDate,omitempty"`
	Status           string    `json:"status"`
	OrganizationName string    `json:"organizationName"`
}

type PerformanceRiskUnitBreakdown struct {
	OrganizationID   *uuid.UUID `json:"organizationId,omitempty"`
	OrganizationName string     `json:"organizationName"`
	RiskCount        int        `json:"riskCount"`
	TotalExposure    int        `json:"totalExposure"`
	HighExtremeCount int        `json:"highExtremeCount"`
}

type PerformanceRiskDetail struct {
	Node        PerformanceRiskNode             `json:"node"`
	Risks       []*PerformanceRiskRiskRow       `json:"risks"`
	Mitigations []*PerformanceRiskMitigationRow `json:"mitigations"`
	Units       []PerformanceRiskUnitBreakdown  `json:"units"`
	GeneratedAt time.Time                       `json:"generatedAt"`
}
