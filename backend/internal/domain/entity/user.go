package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// User represents an application user
type User struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Username       string     `json:"username"`
	Email          string     `json:"email"`
	PasswordHash   string     `json:"-"`
	Role           string     `json:"role"`
	OrganizationID *uuid.UUID `json:"organizationId,omitempty"`
	OrgName        string     `json:"orgName,omitempty"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// Validate performs domain validation on User
func (u *User) Validate() error {
	if u.Name == "" {
		return errors.ErrInvalidName
	}
	if u.Email == "" {
		return errors.ErrInvalidEmail
	}
	if u.Username == "" {
		return errors.ErrInvalidUsername
	}
	if u.Role == "" {
		return errors.ErrInvalidRole
	}
	return nil
}

// IsSuperadmin checks if user is superadmin
func (u *User) IsSuperadmin() bool {
	return u.Role == "superadmin"
}

// IsReviewer checks if user is reviewer
func (u *User) IsReviewer() bool {
	return u.Role == "reviewer"
}

// IsUnit checks if user is unit role
func (u *User) IsUnit() bool {
	return u.Role == "unit"
}

// IsPimpinan checks if user is pimpinan
func (u *User) IsPimpinan() bool {
	return u.Role == "pimpinan"
}

// CanApproveForRole checks if user can approve for given role
func (u *User) CanApproveForRole(approverRole string) bool {
	if u.IsSuperadmin() {
		return true
	}
	if approverRole == "reviewer" && u.IsReviewer() {
		return true
	}
	if approverRole == "pimpinan" && u.IsPimpinan() {
		return true
	}
	return false
}
