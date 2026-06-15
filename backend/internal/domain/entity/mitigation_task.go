package entity

import (
	"time"

	"github.com/google/uuid"
)

// MitigationTask represents a single progress report task auto-generated for a mitigation plan
type MitigationTask struct {
	ID           uuid.UUID  `json:"id"`
	MitigationID uuid.UUID  `json:"mitigationId"`
	RiskID       uuid.UUID  `json:"riskId"`

	// Monitoring link (nullable — only set when task is part of a monitoring cycle)
	MonitoringID *uuid.UUID `json:"monitoringId,omitempty"`

	// Period
	PeriodLabel string `json:"periodLabel"`
	PeriodStart string `json:"periodStart"`
	PeriodEnd   string `json:"periodEnd"`
	DueDate     string `json:"dueDate"`

	// Progress (filled by PIC)
	Status      string  `json:"status"` // pending, done, overdue, skipped
	ProgressPct int     `json:"progressPct"`
	EvidenceURL string  `json:"evidenceUrl"`
	Notes       string  `json:"notes"`

	// Monitoring report fields
	ReportOutput   string `json:"reportOutput"`
	ReportObstacle string `json:"reportObstacle"`

	// Reporter
	ReportedBy     *uuid.UUID `json:"reportedBy,omitempty"`
	ReportedByName string     `json:"reportedByName,omitempty"`
	ReportedAt     *time.Time `json:"reportedAt,omitempty"`

	// Metadata
	GeneratedBy string    `json:"generatedBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	// Joined fields (from mitigation/risk)
	MitigationAction string `json:"mitigationAction,omitempty"`
	MitigationOwner  string `json:"mitigationOwner,omitempty"`
	RiskCode         string `json:"riskCode,omitempty"`
	RiskTitle        string `json:"riskTitle,omitempty"`
}
