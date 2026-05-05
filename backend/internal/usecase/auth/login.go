package auth

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"golang.org/x/crypto/bcrypt"
)

type LoginInput struct {
	Username string
	Password string
}

type LoginUseCase struct {
	userRepo                    repository.UserRepository
	hierarchySvc                *service.OrganizationHierarchy
	jwtSecret                   string
	jwtExpiry                   int
	riskApprovalWorkflowEnabled bool
}

func NewLoginUseCase(
	userRepo repository.UserRepository,
	hierarchySvc *service.OrganizationHierarchy,
	jwtSecret string,
	jwtExpiry int,
	riskApprovalWorkflowEnabled bool,
) *LoginUseCase {
	return &LoginUseCase{
		userRepo:                    userRepo,
		hierarchySvc:                hierarchySvc,
		jwtSecret:                   jwtSecret,
		jwtExpiry:                   jwtExpiry,
		riskApprovalWorkflowEnabled: riskApprovalWorkflowEnabled,
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
	if user == nil {
		return nil, errors.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(input.Password),
	); err != nil {
		return nil, errors.ErrInvalidCredentials
	}

	if user.Status == entity.UserStatusInactive {
		return nil, errors.ErrAccountInactive
	}

	if user.IsPendingActivation() {
		return nil, errors.ErrAccountPendingApproval
	}

	return buildAuthToken(ctx, uc.hierarchySvc, uc.jwtSecret, uc.jwtExpiry, uc.riskApprovalWorkflowEnabled, user, entity.AuthSessionModeFull, false)
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
