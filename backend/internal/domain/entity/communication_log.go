package entity

import (
	"time"

	"github.com/google/uuid"
)

// CommunicationLog represents communication records related to a risk.
type CommunicationLog struct {
	ID            uuid.UUID
	RiskID        uuid.UUID
	Date          time.Time
	Method        string // "Meeting", "Email", "Phone", "Chat"
	Stakeholder   string
	Notes         string
	CreatedBy     uuid.UUID
	CreatedByName string
	CreatedAt     time.Time
}

// CommunicationMethod constants
const (
	CommunicationMethodMeeting = "Meeting"
	CommunicationMethodEmail   = "Email"
	CommunicationMethodPhone   = "Phone"
	CommunicationMethodChat    = "Chat"
)

// ValidCommunicationMethods returns all valid communication methods
func ValidCommunicationMethods() []string {
	return []string{
		CommunicationMethodMeeting,
		CommunicationMethodEmail,
		CommunicationMethodPhone,
		CommunicationMethodChat,
	}
}

// IsValidMethod checks if the method is valid
func IsValidMethod(method string) bool {
	for _, m := range ValidCommunicationMethods() {
		if m == method {
			return true
		}
	}
	return false
}
