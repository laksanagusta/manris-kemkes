package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// AuthToken represents the authentication response with token and user info
type AuthToken struct {
	Token string      `json:"token"`
	User  *UserPublic `json:"user"`
}

// UserPublic represents user information that can be exposed publicly
type UserPublic struct {
	ID             uuid.UUID  `json:"id"`
	Username       string     `json:"username"`
	Name           string     `json:"name"`
	Role           string     `json:"role"`
	OrganizationID *uuid.UUID `json:"organizationId,omitempty"`
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
	ID             uuid.UUID  `json:"id"`
	Username       string     `json:"username"`
	Name           string     `json:"name"`
	Role           string     `json:"role"`
	OrganizationID *uuid.UUID `json:"organizationId,omitempty"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// ToPublic converts UserProfile to UserPublic
func (u *UserProfile) ToPublic() *UserPublic {
	return &UserPublic{
		ID:             u.ID,
		Username:       u.Username,
		Name:           u.Name,
		Role:           u.Role,
		OrganizationID: u.OrganizationID,
	}
}
