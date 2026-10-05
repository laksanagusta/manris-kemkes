package entity

import (
	"github.com/google/uuid"
	"time"
)

// OrganizationAPIKey never serializes the authentication hash.
type OrganizationAPIKey struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organizationId"`
	Hash           string     `json:"-"`
	Prefix         string     `json:"prefix"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	LastUsedAt     *time.Time `json:"lastUsedAt"`
}

type APIKeyAdmission struct {
	OrganizationID uuid.UUID
	Allowed        bool
	RetryAfter     int
}
