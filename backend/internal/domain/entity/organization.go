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
	UPRLevel  string     `json:"uprLevel,omitempty"` // "kementerian", "upr_t1", "upr_t2"
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

// IsRoot returns true if this is the root ministry organization
func (o *Organization) IsRoot() bool {
	return o.ParentID == nil
}

// IsUPRLevel1 returns true if this is a directorate under the root
func (o *Organization) IsUPRLevel1() bool {
	if o.ParentID == nil {
		return false
	}
	return o.UPRLevel == "upr_t1"
}

// IsUPRLevel2 returns true if this is a unit/balai under a directorate
func (o *Organization) IsUPRLevel2() bool {
	return o.UPRLevel == "upr_t2"
}

// ResolveUPRLevel determines the UPR level from parent chain.
// Root org (no parent) = "kementerian"
// Org under root = "upr_t1"
// Org under upr_t1 = "upr_t2"
func (o *Organization) ResolveUPRLevel() string {
	return o.UPRLevel
}
