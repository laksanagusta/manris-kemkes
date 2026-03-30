package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Incident represents an incident report
type Incident struct {
	ID               uuid.UUID
	Code             *string
	Title            string
	What             string
	Who              string
	When             *time.Time
	Where            string
	WhyHow           string
	Severity         string
	Status           string
	CorrectiveAction string
	PreventiveAction string
	LinkedRiskID     *uuid.UUID
	LinkedRiskCode   *string
	ReporterID       *uuid.UUID
	ReporterName     *string
	OrganizationID   *uuid.UUID
	CreatedAt        time.Time
	UpdatedAt        time.Time
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
