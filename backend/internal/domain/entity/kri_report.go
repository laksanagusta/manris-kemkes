package entity

import (
	"time"

	"github.com/google/uuid"
)

// KRIReport represents a periodic report entry for a KRI
type KRIReport struct {
	ID          uuid.UUID  `json:"id"`
	KRIID       uuid.UUID  `json:"kriId"`
	PeriodLabel string     `json:"periodLabel"`
	PeriodStart string     `json:"periodStart"`
	PeriodEnd   string     `json:"periodEnd"`
	DueDate     string     `json:"dueDate"`
	Value       *float64   `json:"value"`
	Notes       string     `json:"notes"`
	Status      string     `json:"status"`
	SubmittedBy *uuid.UUID `json:"submittedBy,omitempty"`
	SubmittedAt *time.Time `json:"submittedAt,omitempty"`
	GeneratedBy string     `json:"generatedBy"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`

	// Joined fields (populated by queries)
	KRIName         string `json:"kriName"`
	KRIMetric       string `json:"kriMetric"`
	RiskCode        string `json:"riskCode"`
	RiskTitle       string `json:"riskTitle"`
	SubmittedByName string `json:"submittedByName"`
}
