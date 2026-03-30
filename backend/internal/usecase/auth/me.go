package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetCurrentUserInput represents the input for get current user use case
type GetCurrentUserInput struct {
	UserID uuid.UUID
}

// GetCurrentUserUseCase handles retrieving the current authenticated user
type GetCurrentUserUseCase struct {
	userRepo repository.UserRepository
}

// NewGetCurrentUserUseCase creates a new get current user use case
func NewGetCurrentUserUseCase(
	userRepo repository.UserRepository,
) *GetCurrentUserUseCase {
	return &GetCurrentUserUseCase{
		userRepo: userRepo,
	}
}

// Execute retrieves the current user by ID
func (uc *GetCurrentUserUseCase) Execute(ctx context.Context, input GetCurrentUserInput) (*entity.UserProfile, error) {
	// 1. Validate input
	if input.UserID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	// 2. Get user from repository
	user, err := uc.userRepo.GetByID(ctx, input.UserID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	// 3. Build user profile
	userProfile := &entity.UserProfile{
		ID:             user.ID,
		Username:       user.Username,
		Name:           user.Name,
		Role:           user.Role,
		OrganizationID: user.OrganizationID,
		Status:         user.Status,
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      user.UpdatedAt,
	}

	return userProfile, nil
}
