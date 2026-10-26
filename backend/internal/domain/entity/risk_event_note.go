package entity

import (
	"github.com/google/uuid"
	"time"
)

type RiskEventNote struct {
	ID            uuid.UUID `json:"id"`
	EventID       uuid.UUID `json:"eventId"`
	Body          string    `json:"body"`
	CreatedBy     uuid.UUID `json:"createdBy"`
	CreatedByName string    `json:"createdByName"`
	CreatedAt     time.Time `json:"createdAt"`
}
