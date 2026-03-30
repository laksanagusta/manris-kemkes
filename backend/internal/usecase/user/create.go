package user

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateUserUseCase handles user creation business logic
type CreateUserUseCase struct {
	userRepo repository.UserRepository
	orgRepo  repository.OrganizationRepository
}

func NewCreateUserUseCase(
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
) *CreateUserUseCase {
	return &CreateUserUseCase{
		userRepo: userRepo,
		orgRepo:  orgRepo,
	}
}

type CreateUserInput struct {
	Name           string
	Username       string
	Email          string
	PasswordHash   string
	Role           string
	OrganizationID *uuid.UUID
	Status         string
}

type CreateUserOutput struct {
	ID        uuid.UUID
	Message   string
	CreatedAt time.Time
}

func (uc *CreateUserUseCase) Execute(ctx context.Context, input CreateUserInput) (*CreateUserOutput, error) {
	// 1. Validate input
	if input.Name == "" {
		return nil, errors.ErrInvalidName
	}
	if input.Username == "" {
		return nil, errors.ErrInvalidUsername
	}
	if input.Email == "" {
		return nil, errors.ErrInvalidEmail
	}
	if input.Role == "" {
		return nil, errors.ErrInvalidRole
	}
	if input.PasswordHash == "" {
		return nil, errors.ErrInvalidInput
	}

	// 2. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 3. Check if username already exists
	existingUser, _ := uc.userRepo.GetByUsername(ctx, input.Username)
	if existingUser != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "username already exists")
	}

	// 4. Create user entity
	user := &entity.User{
		Name:           input.Name,
		Username:       input.Username,
		Email:          input.Email,
		PasswordHash:   input.PasswordHash,
		Role:           input.Role,
		OrganizationID: input.OrganizationID,
		Status:         input.Status,
	}

	if user.Status == "" {
		user.Status = "active"
	}

	// 5. Validate user entity
	if err := user.Validate(); err != nil {
		return nil, err
	}

	// 6. Save to database
	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, errors.Wrap(err, "failed to create user")
	}

	// 7. Return result
	return &CreateUserOutput{
		ID:        user.ID,
		Message:   "User created successfully",
		CreatedAt: user.CreatedAt,
	}, nil
}
