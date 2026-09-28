package entity

import (
	"time"

	"github.com/google/uuid"
)

// QuarterlyReportRisk keeps the period's profile separate from its final
// monitoring observation. The lifecycle marker never changes the profile score.
type QuarterlyReportRisk struct {
	*Risk
	ArchivedInPeriod bool `json:"archivedInPeriod"`
}

type QuarterlyReportTask struct {
	*MitigationTask
	OrganizationID uuid.UUID `json:"organizationId"`
	VersionGroupID uuid.UUID `json:"versionGroupId"`
}

type QuarterlyReportOrganization struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// QuarterlyReportData is the shared source for the report page and exports.
// Empty source data is represented by arrays and a null dataUpdatedAt.
type QuarterlyReportData struct {
	Cycle           string                        `json:"cycle"`
	ComparisonCycle string                        `json:"comparisonCycle"`
	GeneratedAt     time.Time                     `json:"generatedAt"`
	SnapshotHash    string                        `json:"snapshotHash"`
	DataUpdatedAt   *time.Time                    `json:"dataUpdatedAt"`
	Warnings        []string                      `json:"warnings"`
	Organizations   []QuarterlyReportOrganization `json:"organizations"`
	Risks           []*QuarterlyReportRisk        `json:"risks"`
	PreviousRisks   []*QuarterlyReportRisk        `json:"previousRisks"`
	Tasks           []*QuarterlyReportTask        `json:"tasks"`
	PreviousTasks   []*QuarterlyReportTask        `json:"previousTasks"`
	Events          []*RiskEvent                  `json:"events"`
}

type QuarterlyReportPeriodData struct {
	Risks         []*QuarterlyReportRisk
	Tasks         []*QuarterlyReportTask
	Events        []*RiskEvent
	DataUpdatedAt *time.Time
	Warnings      []string
}

type QuarterlyReportSnapshot struct {
	Organizations     []QuarterlyReportOrganization
	Current, Previous *QuarterlyReportPeriodData
}
