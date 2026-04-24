package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// AuthToken represents the authentication response with token and user info
type AuthToken struct {
	Token              string      `json:"token"`
	SessionMode        string      `json:"sessionMode"`
	MustChangePassword bool        `json:"mustChangePassword"`
	User               *UserPublic `json:"user"`
}

type UserCapabilities struct {
	RiskApprovalWorkflowEnabled bool `json:"riskApprovalWorkflowEnabled"`
}

const (
	AuthSessionModeSetup = "setup"
	AuthSessionModeFull  = "full"
)

// UserPublic represents user information that can be exposed publicly
type UserPublic struct {
	ID                 uuid.UUID        `json:"id"`
	Username           string           `json:"username"`
	Name               string           `json:"name"`
	Email              string           `json:"email"`
	Role               string           `json:"role"`
	OrganizationID     *uuid.UUID       `json:"organizationId,omitempty"`
	OrgName            string           `json:"orgName,omitempty"`
	AccessibleOrgIDs   []uuid.UUID      `json:"accessibleOrgIds,omitempty"`
	IsGlobal           bool             `json:"isGlobal"`
	Status             string           `json:"status"`
	NIP                string           `json:"nip,omitempty"`
	Jabatan            string           `json:"jabatan,omitempty"`
	Pangkat            string           `json:"pangkat,omitempty"`
	Capabilities       UserCapabilities `json:"capabilities"`
	MustChangePassword bool             `json:"mustChangePassword"`
}

// LoginCredentials represents user login input
type LoginCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Validate validates the login credentials
func (c *LoginCredentials) Validate() error {
	if c.Username == "" {
		return errors.ErrInvalidUsername
	}
	if c.Password == "" {
		return errors.ErrInvalidPassword
	}
	return nil
}

// UserProfile represents detailed user profile information
type UserProfile struct {
	ID                 uuid.UUID        `json:"id"`
	Username           string           `json:"username"`
	Name               string           `json:"name"`
	Email              string           `json:"email"`
	Role               string           `json:"role"`
	OrganizationID     *uuid.UUID       `json:"organizationId,omitempty"`
	OrgName            string           `json:"orgName,omitempty"`
	AccessibleOrgIDs   []uuid.UUID      `json:"accessibleOrgIds,omitempty"`
	IsGlobal           bool             `json:"isGlobal"`
	Status             string           `json:"status"`
	NIP                string           `json:"nip,omitempty"`
	Jabatan            string           `json:"jabatan,omitempty"`
	Pangkat            string           `json:"pangkat,omitempty"`
	Capabilities       UserCapabilities `json:"capabilities"`
	MustChangePassword bool             `json:"mustChangePassword"`
	CreatedAt          time.Time        `json:"createdAt"`
	UpdatedAt          time.Time        `json:"updatedAt"`
}

// ToPublic converts UserProfile to UserPublic
func (u *UserProfile) ToPublic() *UserPublic {
	return &UserPublic{
		ID:                 u.ID,
		Username:           u.Username,
		Name:               u.Name,
		Email:              u.Email,
		Role:               u.Role,
		OrganizationID:     u.OrganizationID,
		OrgName:            u.OrgName,
		AccessibleOrgIDs:   u.AccessibleOrgIDs,
		IsGlobal:           u.IsGlobal,
		Status:             u.Status,
		NIP:                u.NIP,
		Jabatan:            u.Jabatan,
		Pangkat:            u.Pangkat,
		Capabilities:       u.Capabilities,
		MustChangePassword: u.MustChangePassword,
	}
}
