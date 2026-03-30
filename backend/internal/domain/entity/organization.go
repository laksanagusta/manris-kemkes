package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Organization represents a unit kerja
type Organization struct {
	ID        uuid.UUID
	Name      string
	ParentID  *uuid.UUID
	CreatedAt time.Time
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
