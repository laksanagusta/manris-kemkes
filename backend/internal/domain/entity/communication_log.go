package entity

import (
	"time"

	"github.com/google/uuid"
)

// CommunicationLog represents communication records related to a risk.
type CommunicationLog struct {
	ID            uuid.UUID
	RiskID        uuid.UUID
	Notes         string
	CreatedBy     uuid.UUID
	CreatedByName string
	CreatedAt     time.Time
}
