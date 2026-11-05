package entity

import (
	"time"

	"github.com/google/uuid"
)

// Feedback is an authenticated user's suggestion about the application.
type Feedback struct {
	ID        uuid.UUID `json:"id"`
	CreatedBy uuid.UUID `json:"createdBy"`
	RequestID uuid.UUID `json:"-"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}
