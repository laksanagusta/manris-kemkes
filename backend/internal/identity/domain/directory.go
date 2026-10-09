package domain

import (
	"github.com/google/uuid"
	"time"
)

// DirectoryUser exposes shared directory fields without authentication or session data.
type DirectoryUser struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Username       string     `json:"username,omitempty"`
	Email          string     `json:"email"`
	Role           string     `json:"role"`
	OrganizationID *uuid.UUID `json:"organizationId,omitempty"`
	OrgName        string     `json:"orgName,omitempty"`
	Status         string     `json:"status"`
	NIP            string     `json:"nip,omitempty"`
	Jabatan        string     `json:"jabatan,omitempty"`
	Pangkat        string     `json:"pangkat,omitempty"`
	PhoneNumber    string     `json:"phoneNumber,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// DirectoryUserFrom projects an account onto its public directory fields.
func DirectoryUserFrom(u *User) *DirectoryUser {
	return &DirectoryUser{ID: u.ID, Name: u.Name, Username: u.Username, Email: u.Email,
		Role: NormalizeRole(u.Role), OrganizationID: u.OrganizationID, OrgName: u.OrgName,
		Status: u.Status, NIP: u.NIP, Jabatan: u.Jabatan, Pangkat: u.Pangkat,
		PhoneNumber: u.PhoneNumber, CreatedAt: u.CreatedAt, UpdatedAt: u.UpdatedAt}
}

// DirectoryFilter carries server-derived scope as well as client filters.
// Global and AllowedOrgIDs must never be populated from request input.
type DirectoryFilter struct {
	Page, Limit     int
	Q, Role, Status string
	OrganizationID  *uuid.UUID
	Global          bool
	AllowedOrgIDs   []uuid.UUID
}

type DirectoryPage struct {
	Data  []*DirectoryUser `json:"data"`
	Total int              `json:"total"`
	Page  int              `json:"page"`
	Limit int              `json:"limit"`
}
