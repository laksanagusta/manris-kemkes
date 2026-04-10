package auth

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

type LoginInput struct {
	Username string
	Password string
}

type LoginUseCase struct {
	userRepo     repository.UserRepository
	hierarchySvc *service.OrganizationHierarchy
	jwtSecret    string
	jwtExpiry    int
}

func NewLoginUseCase(
	userRepo repository.UserRepository,
	hierarchySvc *service.OrganizationHierarchy,
	jwtSecret string,
	jwtExpiry int,
) *LoginUseCase {
	return &LoginUseCase{
		userRepo:     userRepo,
		hierarchySvc: hierarchySvc,
		jwtSecret:    jwtSecret,
		jwtExpiry:    jwtExpiry,
	}
}

func (uc *LoginUseCase) Execute(ctx context.Context, input LoginInput) (*entity.AuthToken, error) {
	if err := validateLoginInput(input); err != nil {
		return nil, err
	}

	user, err := uc.userRepo.GetByUsername(ctx, input.Username)
	if err != nil {
		return nil, errors.ErrInvalidCredentials
	}

	if user.Status != "active" {
		return nil, errors.ErrAccountInactive
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(input.Password),
	); err != nil {
		return nil, errors.ErrInvalidCredentials
	}

	orgID := ""
	if user.OrganizationID != nil {
		orgID = user.OrganizationID.String()
	}

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

	scope, err := uc.hierarchySvc.ResolveAccessScope(ctx, user.ID, user.Role, user.OrganizationID)
	if err != nil {
		return nil, err
	}

	authToken := &entity.AuthToken{
		Token: token,
		User: &entity.UserPublic{
			ID:               user.ID,
			Username:         user.Username,
			Name:             user.Name,
			Role:             user.Role,
			OrganizationID:   user.OrganizationID,
			AccessibleOrgIDs: scope.AccessibleOrgIDs,
			IsGlobal:         scope.IsGlobal,
		},
	}

	return authToken, nil
}

func validateLoginInput(input LoginInput) error {
	if input.Username == "" {
		return errors.ErrInvalidUsername
	}
	if input.Password == "" {
		return errors.ErrInvalidPassword
	}
	return nil
}
