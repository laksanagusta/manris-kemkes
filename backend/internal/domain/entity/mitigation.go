package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Mitigation represents a risk treatment plan item
type Mitigation struct {
	ID                uuid.UUID  `json:"id"`
	RiskID            uuid.UUID  `json:"riskId"`
	Action            string     `json:"action"`
	Owner             string     `json:"owner"`
	OwnerUserID       *uuid.UUID `json:"ownerUserId,omitempty"`
	DueDate           *string    `json:"dueDate,omitempty"`
	Frequency         string     `json:"frequency,omitempty"`
	RecurringInterval *string    `json:"recurringInterval,omitempty"`
	ReportDay         *int       `json:"reportDay,omitempty"`         // 0=Sun..6=Sat (for mingguan)
	ReportDate        *int       `json:"reportDate,omitempty"`        // 1-31 (for bulanan/triwulan)
	TargetCost        float64    `json:"targetCost"`
	SortOrder         int        `json:"sortOrder"`
	CreatedAt         time.Time  `json:"createdAt"`
}

// MitigationAssoc represents a mitigation joined with its parent risk info
type MitigationAssoc struct {
	Mitigation
	RiskCode    string     `json:"riskCode"`
	RiskTitle   string     `json:"riskTitle"`
	RiskOrgID   *uuid.UUID `json:"riskOrgId,omitempty"`
	Probability int        `json:"probability"`
	Impact      int        `json:"impact"`
}

// Validate performs domain validation on Mitigation
func (m *Mitigation) Validate() error {
	if m.Action == "" {
		return errors.ErrInvalidAction
	}
	if m.Owner == "" {
		return errors.ErrInvalidOwner
	}
	return nil
}

// IsOverdue checks if mitigation is overdue
func (m *Mitigation) IsOverdue() bool {
	if m.DueDate == nil {
		return false
	}

	dueDate, err := time.Parse("2006-01-02", *m.DueDate)
	if err != nil {
		return false
	}

	return time.Now().After(dueDate)
}

// GetStatus returns the status of mitigation
func (m *Mitigation) GetStatus() string {
	if m.IsOverdue() {
		return "overdue"
	}
	if m.DueDate == nil {
		return "not_scheduled"
	}
	return "on_track"
}
