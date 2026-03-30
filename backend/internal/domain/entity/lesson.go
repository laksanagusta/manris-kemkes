package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Lesson represents a lessons learned entry
type Lesson struct {
	ID              uuid.UUID
	Title           string
	Description     string
	SourceType      string
	SourceRef       string
	SuccessFactors  string
	FailureFactors  string
	Recommendations string
	Tags            []string
	AuthorID        *uuid.UUID
	AuthorName      string
	OrganizationID  *uuid.UUID
	CreatedAt       time.Time
}

// Validate performs domain validation on Lesson
func (l *Lesson) Validate() error {
	if l.Title == "" {
		return errors.ErrInvalidTitle
	}
	if l.Description == "" {
		return errors.ErrInvalidDescription
	}
	if l.SourceType == "" {
		return errors.ErrInvalidSourceType
	}
	return nil
}

// HasTags checks if lesson has tags
func (l *Lesson) HasTags() bool {
	return len(l.Tags) > 0
}

// IsFromIncident checks if lesson is from incident
func (l *Lesson) IsFromIncident() bool {
	return l.SourceType == "incident"
}

// IsFromRisk checks if lesson is from risk
func (l *Lesson) IsFromRisk() bool {
	return l.SourceType == "risk"
}
