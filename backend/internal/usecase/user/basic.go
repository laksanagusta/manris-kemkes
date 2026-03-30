package user

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetUserUseCase retrieves a single user by ID
type GetUserUseCase struct {
	userRepo repository.UserRepository
}

func NewGetUserUseCase(userRepo repository.UserRepository) *GetUserUseCase {
	return &GetUserUseCase{
		userRepo: userRepo,
	}
}

func (uc *GetUserUseCase) Execute(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	return user, nil
}

// ListUsersUseCase retrieves all users
type ListUsersUseCase struct {
	userRepo repository.UserRepository
}

func NewListUsersUseCase(userRepo repository.UserRepository) *ListUsersUseCase {
	return &ListUsersUseCase{
		userRepo: userRepo,
	}
}

func (uc *ListUsersUseCase) Execute(ctx context.Context) ([]*entity.User, error) {
	users, err := uc.userRepo.List(ctx)
	if err != nil {
		return nil, err
	}

	return users, nil
}

// UpdateUserUseCase handles user update business logic
type UpdateUserUseCase struct {
	userRepo repository.UserRepository
	orgRepo  repository.OrganizationRepository
}

func NewUpdateUserUseCase(
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
) *UpdateUserUseCase {
	return &UpdateUserUseCase{
		userRepo: userRepo,
		orgRepo:  orgRepo,
	}
}

type UpdateUserInput struct {
	ID             uuid.UUID
	Name           string
	Username       string
	Email          string
	Role           string
	OrganizationID *uuid.UUID
	Status         string
}

type UpdateUserOutput struct {
	ID        uuid.UUID
	Message   string
	UpdatedAt time.Time
}

func (uc *UpdateUserUseCase) Execute(ctx context.Context, input UpdateUserInput) (*UpdateUserOutput, error) {
	// 1. Get existing user
	existingUser, err := uc.userRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	// 2. Validate organization if changed
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 3. Update user entity (not changing password here)
	existingUser.Name = input.Name
	existingUser.Username = input.Username
	existingUser.Email = input.Email
	existingUser.Role = input.Role
	existingUser.OrganizationID = input.OrganizationID
	existingUser.Status = input.Status

	// 4. Validate user entity
	if err := existingUser.Validate(); err != nil {
		return nil, err
	}

	// 5. Save to database
	if err := uc.userRepo.Update(ctx, existingUser); err != nil {
		return nil, errors.Wrap(err, "failed to update user")
	}

	// 6. Return result
	return &UpdateUserOutput{
		ID:        existingUser.ID,
		Message:   "User updated successfully",
		UpdatedAt: existingUser.UpdatedAt,
	}, nil
}

// DeleteUserUseCase handles user deletion business logic
type DeleteUserUseCase struct {
	userRepo repository.UserRepository
}

func NewDeleteUserUseCase(userRepo repository.UserRepository) *DeleteUserUseCase {
	return &DeleteUserUseCase{
		userRepo: userRepo,
	}
}

type DeleteUserOutput struct {
	Message string
}

func (uc *DeleteUserUseCase) Execute(ctx context.Context, id uuid.UUID) (*DeleteUserOutput, error) {
	// 1. Get existing user to check if it exists
	_, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	// 2. Delete from database
	if err := uc.userRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteUserOutput{
		Message: "User deleted successfully",
	}, nil
}
