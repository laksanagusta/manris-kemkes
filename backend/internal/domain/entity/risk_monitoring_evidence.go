package entity

import (
	"github.com/google/uuid"
	"time"
)

type MonitoringEvidenceReport struct {
	ID          uuid.UUID  `json:"id"`
	Action      string     `json:"action"`
	Status      string     `json:"status"`
	Notes       string     `json:"notes"`
	EvidenceURL string     `json:"evidenceUrl"`
	ReportedAt  *time.Time `json:"reportedAt,omitempty"`
}
type MonitoringEvidenceEvent struct {
	ID          uuid.UUID       `json:"id"`
	Code        string          `json:"code"`
	Description string          `json:"description"`
	OccurredAt  time.Time       `json:"occurredAt"`
	Notes       []RiskEventNote `json:"notes"`
}
type RiskMonitoringEvidence struct {
	CapturedAt  time.Time                  `json:"capturedAt"`
	Title       string                     `json:"title"`
	SourceScore float64                    `json:"sourceScore"`
	TargetScore float64                    `json:"targetScore"`
	Reports     []MonitoringEvidenceReport `json:"reports"`
	Events      []MonitoringEvidenceEvent  `json:"events"`
}
type RiskMonitoringEvidenceResult struct {
	Evidence *RiskMonitoringEvidence `json:"evidence"`
	Final    bool                    `json:"final"`
}
