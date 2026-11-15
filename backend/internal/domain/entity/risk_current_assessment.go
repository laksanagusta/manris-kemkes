package entity

import "github.com/google/uuid"

// RiskCurrentAssessment is a read projection. Stored profile scores remain the
// immutable baseline; this is the latest final observation on that version.
type RiskCurrentAssessment struct {
	ID              uuid.UUID `json:"id"`
	TransactionKind string    `json:"transactionKind"`
	ObservedAt      string    `json:"observedAt"`
	Probability     int       `json:"probability"`
	Impact          int       `json:"impact"`
	Weight          float64   `json:"weight"`
	Nilai           float64   `json:"nilai"`
	InherentScore   int       `json:"inherentScore"`
}
