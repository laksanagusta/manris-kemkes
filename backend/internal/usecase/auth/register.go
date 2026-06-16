package auth

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"golang.org/x/crypto/bcrypt"
)

type RegisterInput struct {
	Name            string
	Email           string
	Password        string
	ConfirmPassword string
	OrganizationID  *uuid.UUID
	NIP             string
	Jabatan         string
	Pangkat         string
	PhoneNumber     string
}

type RegisterOutput struct {
	ID        uuid.UUID
	Message   string
	CreatedAt time.Time
}

type RegisterUseCase struct {
	userRepo repository.UserRepository
	orgRepo  repository.OrganizationRepository
}

func NewRegisterUseCase(
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
) *RegisterUseCase {
	return &RegisterUseCase{
		userRepo: userRepo,
		orgRepo:  orgRepo,
	}
}

func (uc *RegisterUseCase) Execute(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	if err := validateRegisterInput(input); err != nil {
		return nil, err
	}

	if input.OrganizationID == nil {
		return nil, errors.ErrOrganizationRequired
	}

	if _, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID); err != nil {
		return nil, errors.ErrOrganizationNotFound
	}

	if existingUser, err := uc.userRepo.GetByUsername(ctx, input.Email); err == nil && existingUser != nil {
		return nil, errors.ErrEmailAlreadyExists
	}

	if existingUser, err := uc.userRepo.GetByNIP(ctx, input.NIP); err == nil && existingUser != nil {
		return nil, errors.ErrNIPAlreadyExists
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, "failed to hash password")
	}

	user := &entity.User{
		Name:               input.Name,
		Username:           input.NIP,
		Email:              input.Email,
		PasswordHash:       string(passwordHash),
		Role:               entity.RoleUnit,
		OrganizationID:     input.OrganizationID,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: false,
		NIP:                input.NIP,
		Jabatan:            input.Jabatan,
		Pangkat:            input.Pangkat,
		PhoneNumber:        input.PhoneNumber,
	}

	if err := user.Validate(); err != nil {
		return nil, err
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, errors.Wrap(err, "failed to create user")
	}

	return &RegisterOutput{
		ID:        user.ID,
		Message:   "Registration submitted successfully",
		CreatedAt: user.CreatedAt,
	}, nil
}

func validateRegisterInput(input RegisterInput) error {
	if input.Name == "" {
		return errors.ErrInvalidName
	}
	if input.Email == "" {
		return errors.ErrInvalidEmail
	}
	if input.Password == "" {
		return errors.ErrInvalidPassword
	}
	if input.ConfirmPassword == "" {
		return errors.ErrInvalidPassword
	}
	if input.Password != input.ConfirmPassword {
		return errors.ErrPasswordConfirmation
	}
	if input.NIP == "" {
		return errors.ErrNIPRequired
	}
	if input.PhoneNumber == "" {
		return errors.ErrPhoneRequired
	}
	return nil
}
