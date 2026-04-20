package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Organization represents a unit kerja
type Organization struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	ParentID  *uuid.UUID `json:"parentId,omitempty"`
	Context   string     `json:"context,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

// Validate performs domain validation on Organization
func (o *Organization) Validate() error {
	if o.Name == "" {
		return errors.ErrInvalidName
	}
	return nil
}

// HasParent checks if organization has a parent
func (o *Organization) HasParent() bool {
	return o.ParentID != nil
}
