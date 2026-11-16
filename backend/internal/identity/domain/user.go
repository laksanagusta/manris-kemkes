package domain

import (
	"net/mail"
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
	ID                         uuid.UUID  `json:"id"`
	Name                       string     `json:"name"`
	Username                   string     `json:"username,omitempty"`
	Email                      string     `json:"email"`
	PasswordHash               string     `json:"-"`
	Role                       string     `json:"role"`
	OrganizationID             *uuid.UUID `json:"organizationId,omitempty"`
	OrgName                    string     `json:"orgName,omitempty"`
	Status                     string     `json:"status"`
	EmailVerified              bool       `json:"emailVerified,omitempty"`
	TemporaryPasswordExpiresAt *time.Time `json:"-"`
	MustChangePassword         bool       `json:"mustChangePassword"`
	NIP                        string     `json:"nip"`
	Jabatan                    string     `json:"jabatan"`
	Pangkat                    string     `json:"pangkat"`
	PhoneNumber                string     `json:"phoneNumber"`
	CreatedAt                  time.Time  `json:"createdAt"`
	UpdatedAt                  time.Time  `json:"updatedAt"`
	LastLoggedIn               time.Time  `json:"lastLoggedIn"`
}

func ValidEmailAddress(email string) bool {
	address, err := mail.ParseAddress(email)
	return err == nil && address.Address == email && len(email) <= 254
}

// Validate performs domain validation on User
func (u *User) Validate() error {
	if u.Name == "" {
		return errors.ErrInvalidName
	}
	if u.Email == "" {
		return errors.ErrInvalidEmail
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

// IsAwaitingEmailVerification reports whether a self-registered account still needs email verification.
func (u *User) IsAwaitingEmailVerification() bool {
	// Administrator-created accounts are pending with a temporary password.
	return u.IsPendingActivation() && !u.MustChangePassword && !u.EmailVerified
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
