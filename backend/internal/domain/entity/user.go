package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

const (
	RoleSuperAdmin = "superadmin"
	RoleUnit       = "unit"
	RoleReviewer   = "reviewer"
	RolePimpinan   = "pimpinan"
)

const (
	UserStatusPendingActivation = "pending_activation"
	UserStatusActive            = "active"
	UserStatusInactive          = "inactive"
)

func IsValidUserStatus(status string) bool {
	switch status {
	case UserStatusPendingActivation, UserStatusActive, UserStatusInactive:
		return true
	default:
		return false
	}
}

// NormalizeRole maps role aliases to the canonical form.
func NormalizeRole(role string) string {
	switch role {
	case "super_admin", "admin":
		return RoleSuperAdmin
	default:
		return role
	}
}

// User represents an application user
type User struct {
	ID                 uuid.UUID  `json:"id"`
	Name               string     `json:"name"`
	Username           string     `json:"username"`
	Email              string     `json:"email"`
	PasswordHash       string     `json:"-"`
	Role               string     `json:"role"`
	OrganizationID     *uuid.UUID `json:"organizationId,omitempty"`
	OrgName            string     `json:"orgName,omitempty"`
	Status             string     `json:"status"`
	MustChangePassword bool       `json:"mustChangePassword"`
	NIP                string     `json:"nip,omitempty"`
	Jabatan            string     `json:"jabatan,omitempty"`
	Pangkat            string     `json:"pangkat,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
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
	if !IsValidUserStatus(u.Status) {
		return errors.ErrInvalidStatus
	}
	return nil
}

func (u *User) IsPendingActivation() bool {
	return u.Status == UserStatusPendingActivation
}

func (u *User) CanUseFullSession() bool {
	return u.Status == UserStatusActive && !u.MustChangePassword
}

// IsSuperadmin checks if user is superadmin
func (u *User) IsSuperadmin() bool {
	return u.Role == RoleSuperAdmin
}

// IsReviewer checks if user is reviewer
func (u *User) IsReviewer() bool {
	return u.Role == RoleReviewer
}

// IsUnit checks if user is unit role
func (u *User) IsUnit() bool {
	return u.Role == RoleUnit
}

// IsPimpinan checks if user is pimpinan
func (u *User) IsPimpinan() bool {
	return u.Role == RolePimpinan
}

// CanApproveForRole checks if user can approve for given role
func (u *User) CanApproveForRole(approverRole string) bool {
	if u.IsSuperadmin() {
		return true
	}
	if approverRole == RoleReviewer && u.IsReviewer() {
		return true
	}
	if approverRole == RolePimpinan && u.IsPimpinan() {
		return true
	}
	return false
}
