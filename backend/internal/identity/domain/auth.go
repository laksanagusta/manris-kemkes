package domain

import (
	"github.com/google/uuid"
	"time"
)

const ManrisApplication = "manris"

// Profile contains shared identity data only; application feature flags do not belong here.
type Profile struct {
	ID                 uuid.UUID     `json:"id"`
	Username           string        `json:"username,omitempty"`
	Name               string        `json:"name"`
	Email              string        `json:"email"`
	Role               string        `json:"role"`
	OrganizationID     *uuid.UUID    `json:"organizationId,omitempty"`
	Organization       *Organization `json:"organization,omitempty"`
	OrgName            string        `json:"orgName,omitempty"`
	AccessibleOrgIDs   []uuid.UUID   `json:"accessibleOrgIds,omitempty"`
	IsGlobal           bool          `json:"isGlobal"`
	Status             string        `json:"status"`
	NIP                string        `json:"nip,omitempty"`
	Jabatan            string        `json:"jabatan,omitempty"`
	Pangkat            string        `json:"pangkat,omitempty"`
	PhoneNumber        string        `json:"phoneNumber,omitempty"`
	MustChangePassword bool          `json:"mustChangePassword"`
	CreatedAt          time.Time     `json:"createdAt"`
	UpdatedAt          time.Time     `json:"updatedAt"`
}

type Application struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Active     bool      `json:"active"`
	KeyHash    string    `json:"-"`
	KeyVersion int       `json:"-"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Session struct {
	ID                  uuid.UUID
	ApplicationID       string
	UserID              uuid.UUID
	KeyVersion          int
	PasswordFingerprint string
	ExpiresAt           time.Time
}

type LoginResult struct {
	Token              string    `json:"token"`
	AppID              string    `json:"appId"`
	ExpiresAt          time.Time `json:"expiresAt"`
	SessionMode        string    `json:"sessionMode"`
	MustChangePassword bool      `json:"mustChangePassword"`
	User               *Profile  `json:"user"`
}

type Identity struct {
	Profile       *Profile
	SessionID     uuid.UUID
	ApplicationID string
}

type ProfileUpdate struct{ Name, Email, NIP, Jabatan, Pangkat string }
