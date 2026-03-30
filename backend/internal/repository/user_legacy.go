package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/repository"
)

// UserRepo is a legacy interface for auth_handler (to be removed when auth_handler is refactored)
// This wraps the clean domain UserRepository
type UserRepo interface {
	FindByUsername(ctx context.Context, username string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
}

// User is a legacy model for auth_handler (to be removed when auth_handler is refactored)
type User struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Username       string     `json:"username"`
	Email          string     `json:"email"`
	PasswordHash   string     `json:"password_hash"`
	Role           string     `json:"role"`
	Status         string     `json:"status"`
	OrganizationID *uuid.UUID `json:"organization_id"`
}

// userRepoAdapter adapts domain UserRepository to legacy UserRepo interface
type userRepoAdapter struct {
	domainRepo repository.UserRepository
}

// NewUserRepoAdapter creates a legacy UserRepo adapter
func NewUserRepoAdapter(domainRepo repository.UserRepository) UserRepo {
	return &userRepoAdapter{domainRepo: domainRepo}
}

func (a *userRepoAdapter) FindByUsername(ctx context.Context, username string) (*User, error) {
	entityUser, err := a.domainRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}

	return &User{
		ID:             entityUser.ID,
		Name:           entityUser.Name,
		Username:       entityUser.Username,
		Email:          entityUser.Email,
		PasswordHash:   entityUser.PasswordHash,
		Role:           entityUser.Role,
		Status:         entityUser.Status,
		OrganizationID: entityUser.OrganizationID,
	}, nil
}

func (a *userRepoAdapter) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
	entityUser, err := a.domainRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &User{
		ID:             entityUser.ID,
		Name:           entityUser.Name,
		Username:       entityUser.Username,
		Email:          entityUser.Email,
		PasswordHash:   entityUser.PasswordHash,
		Role:           entityUser.Role,
		Status:         entityUser.Status,
		OrganizationID: entityUser.OrganizationID,
	}, nil
}
