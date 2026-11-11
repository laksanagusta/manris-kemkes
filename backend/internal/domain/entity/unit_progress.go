package entity

import (
	"time"

	"github.com/google/uuid"
)

type UnitProgressItem struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID uuid.UUID `json:"organizationId"`
	Code           string    `json:"code"`
	Title          string    `json:"title"`
	Status         string    `json:"status"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type UnitProgressRisk struct {
	UnitProgressItem
	MonitoringID     *uuid.UUID `json:"monitoringId,omitempty"`
	MonitoringStatus string     `json:"monitoringStatus,omitempty"`
	ProfileChanged   bool       `json:"profileChanged"`
}

type UnitProgressWorkingPaper struct {
	UnitProgressItem
	Signed     int    `json:"signed"`
	Signers    int    `json:"signers"`
	NextSigner string `json:"nextSigner,omitempty"`
	TTESkipped bool   `json:"tteSkipped"`
}

type UnitProgressMitigation struct {
	UnitProgressItem
	RiskTitle    string `json:"riskTitle"`
	Owner        string `json:"owner"`
	DueDate      string `json:"dueDate"`
	Overdue      bool   `json:"overdue"`
	ReportedLate bool   `json:"reportedLate"`
}

type UnitProgressReport struct {
	Cycle               string                        `json:"cycle"`
	MonitoringAvailable bool                          `json:"monitoringAvailable"`
	Organizations       []QuarterlyReportOrganization `json:"organizations"`
	Risks               []UnitProgressRisk            `json:"risks"`
	WorkingPapers       []UnitProgressWorkingPaper    `json:"workingPapers"`
	Evaluations         []UnitProgressItem            `json:"evaluations"`
	Mitigations         []UnitProgressMitigation      `json:"mitigations"`
}

type UnitProgressSnapshot struct {
	Organizations []QuarterlyReportOrganization
	Risks         []UnitProgressRisk
	WorkingPapers []UnitProgressWorkingPaper
	Evaluations   []UnitProgressItem
	Tasks         []*QuarterlyReportTask
}
