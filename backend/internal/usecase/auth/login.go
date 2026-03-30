package auth

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

// LoginInput represents the input for login use case
type LoginInput struct {
	Username string
	Password string
}

// LoginUseCase handles user authentication
type LoginUseCase struct {
	userRepo  repository.UserRepository
	jwtSecret string
	jwtExpiry int
}

// NewLoginUseCase creates a new login use case
func NewLoginUseCase(
	userRepo repository.UserRepository,
	jwtSecret string,
	jwtExpiry int,
) *LoginUseCase {
	return &LoginUseCase{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		jwtExpiry: jwtExpiry,
	}
}

// Execute performs the login operation
func (uc *LoginUseCase) Execute(ctx context.Context, input LoginInput) (*entity.AuthToken, error) {
	// 1. Validate input
	if err := validateLoginInput(input); err != nil {
		return nil, err
	}

	// 2. Get user from repository
	user, err := uc.userRepo.GetByUsername(ctx, input.Username)
	if err != nil {
		// Don't reveal if user exists or not for security
		return nil, errors.ErrInvalidCredentials
	}

	// 3. Check account status
	if user.Status != "active" {
		return nil, errors.ErrAccountInactive
	}

	// 4. Verify password
	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(input.Password),
	); err != nil {
		return nil, errors.ErrInvalidCredentials
	}

	// 5. Prepare organization ID
	orgID := ""
	if user.OrganizationID != nil {
		orgID = user.OrganizationID.String()
	}

	// 6. Generate JWT token
	token, err := middleware.GenerateToken(
		user.ID,
		user.Username,
		user.Role,
		orgID,
		uc.jwtSecret,
		uc.jwtExpiry,
	)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate token")
	}

	// 7. Build response
	authToken := &entity.AuthToken{
		Token: token,
		User: &entity.UserPublic{
			ID:       user.ID,
			Username: user.Username,
			Name:     user.Name,
			Role:     user.Role,
		},
	}

	return authToken, nil
}

// validateLoginInput validates the login input
func validateLoginInput(input LoginInput) error {
	if input.Username == "" {
		return errors.ErrInvalidUsername
	}
	if input.Password == "" {
		return errors.ErrInvalidPassword
	}
	return nil
}
