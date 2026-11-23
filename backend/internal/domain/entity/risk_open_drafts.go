package entity

import "github.com/google/uuid"

// RiskOpenDrafts identifies unfinished work across the whole risk version family.
type RiskOpenDrafts struct {
	MonitoringID          *uuid.UUID `json:"monitoringId,omitempty"`
	RevisionRiskID        *uuid.UUID `json:"revisionRiskId,omitempty"`
	RevisionMonitoringID  *uuid.UUID `json:"revisionMonitoringId,omitempty"`
	RevisionBlockedPeriod *string    `json:"revisionBlockedPeriod,omitempty"`
}
