package model

import "time"

// Risk represents a simplified risk model for AI generation
// This is a temporary model used only by ai_handler until it's refactored to use domain entities
type Risk struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Probability int       `json:"probability"`
	Impact      int       `json:"impact"`
	Cause       []string  `json:"cause"`
	CreatedAt   time.Time `json:"created_at"`
}

// Organization represents a simplified organization model
// This is a temporary model used only by organization_repo until it's refactored
type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ParentID  *string   `json:"parent_id"`
	CreatedAt time.Time `json:"created_at"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse represents a successful login response
type LoginResponse struct {
	Token string `json:"token"`
	User  struct {
		ID       string `json:"id"`
		Username string `json:"username"`
		Name     string `json:"name"`
		Role     string `json:"role"`
	} `json:"user"`
}
