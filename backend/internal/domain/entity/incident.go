package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Incident represents an incident report
type Incident struct {
	ID               uuid.UUID          `json:"id"`
	Code             *string            `json:"code,omitempty"`
	Title            string             `json:"title"`
	What             string             `json:"what"`
	Who              string             `json:"who"`
	When             *time.Time         `json:"when,omitempty"`
	Where            string             `json:"where"`
	WhyHow           string             `json:"whyHow"`
	Severity         string             `json:"severity"`
	Status           string             `json:"status"`
	CorrectiveAction string             `json:"correctiveAction"`
	PreventiveAction string             `json:"preventiveAction"`
	LinkedRiskID     *uuid.UUID         `json:"linkedRiskId,omitempty"`
	LinkedRiskCode   *string            `json:"linkedRiskCode,omitempty"`
	LinkedRisks      []IncidentRiskLink `json:"linkedRisks,omitempty"`
	ReporterID       *uuid.UUID         `json:"reporterId,omitempty"`
	ReporterName     *string            `json:"reporterName,omitempty"`
	OrganizationID   *uuid.UUID         `json:"organizationId,omitempty"`
	CreatedAt        time.Time          `json:"createdAt"`
	UpdatedAt        time.Time          `json:"updatedAt"`
}

// IncidentRiskLink represents a risk linked to an incident.
type IncidentRiskLink struct {
	ID    uuid.UUID `json:"id"`
	Code  string    `json:"code"`
	Title string    `json:"title"`
}

// Validate performs domain validation on Incident
func (i *Incident) Validate() error {
	if i.Title == "" {
		return errors.ErrInvalidTitle
	}
	if i.What == "" {
		return errors.ErrInvalidDescription
	}
	if i.Who == "" {
		return errors.ErrInvalidDescription
	}
	if i.Where == "" {
		return errors.ErrInvalidDescription
	}
	if i.Severity == "" {
		return errors.ErrInvalidSeverity
	}
	if i.Status == "" {
		return errors.ErrInvalidStatus
	}
	return nil
}

// CanBeSubmittedForApproval checks if incident can be submitted for approval
func (i *Incident) CanBeSubmittedForApproval() bool {
	return i.Status == "draft" || i.Status == "rejected"
}

// IsCritical checks if incident is critical severity
func (i *Incident) IsCritical() bool {
	return i.Severity == "critical"
}

// IsOpen checks if incident is still open
func (i *Incident) IsOpen() bool {
	return i.Status == "open" || i.Status == "investigating"
}

// GetSeverityLevel returns numeric severity level
func (i *Incident) GetSeverityLevel() int {
	levels := map[string]int{
		"insignificant": 1,
		"minor":         2,
		"major":         3,
		"critical":      4,
	}
	return levels[i.Severity]
}
