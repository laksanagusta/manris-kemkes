package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"golang.org/x/crypto/bcrypt"
)

type ChangePasswordInput struct {
	UserID          uuid.UUID
	CurrentPassword string
	NewPassword     string
	ConfirmPassword string
}

type ChangePasswordUseCase struct {
	userRepo     repository.UserRepository
	hierarchySvc *service.OrganizationHierarchy
	jwtSecret    string
	jwtExpiry    int
}

func NewChangePasswordUseCase(
	userRepo repository.UserRepository,
	hierarchySvc *service.OrganizationHierarchy,
	jwtSecret string,
	jwtExpiry int,
) *ChangePasswordUseCase {
	return &ChangePasswordUseCase{
		userRepo:     userRepo,
		hierarchySvc: hierarchySvc,
		jwtSecret:    jwtSecret,
		jwtExpiry:    jwtExpiry,
	}
}

func (uc *ChangePasswordUseCase) Execute(ctx context.Context, input ChangePasswordInput) (*entity.AuthToken, error) {
	if err := validateChangePasswordInput(input); err != nil {
		return nil, err
	}

	user, err := uc.userRepo.GetByID(ctx, input.UserID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if user == nil {
		return nil, errors.ErrNotFound
	}
	if user.Status == entity.UserStatusInactive {
		return nil, errors.ErrForbidden
	}

	if user.IsPendingActivation() && user.MustChangePassword {
		user.Status = entity.UserStatusActive
		user.MustChangePassword = false
	} else {
		if user.Status != entity.UserStatusActive {
			return nil, errors.ErrForbidden
		}
		if input.CurrentPassword == "" {
			return nil, errors.Wrap(errors.ErrInvalidInput, "currentPassword is required for active users")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.CurrentPassword)); err != nil {
			return nil, errors.ErrInvalidCredentials
		}
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, "failed to hash password")
	}

	user.PasswordHash = string(passwordHash)

	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, errors.Wrap(err, "failed to update user")
	}

	return buildAuthToken(ctx, uc.hierarchySvc, uc.jwtSecret, uc.jwtExpiry, user, entity.AuthSessionModeFull, false)
}

func validateChangePasswordInput(input ChangePasswordInput) error {
	if input.UserID == uuid.Nil {
		return errors.ErrInvalidInput
	}
	if input.NewPassword == "" || input.ConfirmPassword == "" {
		return errors.Wrap(errors.ErrInvalidInput, "newPassword and confirmPassword are required")
	}
	if input.NewPassword != input.ConfirmPassword {
		return errors.Wrap(errors.ErrInvalidInput, "password confirmation does not match")
	}
	return nil
}
