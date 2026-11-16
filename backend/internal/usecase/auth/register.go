package auth

import (
	"context"
	stderrors "errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/identity/domain"
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
	ID                     uuid.UUID
	Message                string
	CreatedAt              time.Time
	VerificationQueued     bool       `json:"verificationQueued"`
	VerificationDeliveryID *uuid.UUID `json:"verificationDeliveryId,omitempty"`
}

var ErrRegistrationEmailUnavailable = stderrors.New("Registrasi belum tersedia karena layanan verifikasi email belum aktif.")

type RegistrationVerifier interface {
	QueueRegistrationVerification(context.Context, *entity.User) (uuid.UUID, error)
}

type RegisterUseCase struct {
	userRepo repository.UserRepository
	orgRepo  repository.OrganizationRepository
	verifier RegistrationVerifier
}

func NewRegisterUseCase(
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
	verifier RegistrationVerifier,
) *RegisterUseCase {
	return &RegisterUseCase{
		userRepo: userRepo,
		orgRepo:  orgRepo,
		verifier: verifier,
	}
}

func (uc *RegisterUseCase) Execute(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	input.Email = strings.TrimSpace(input.Email)
	input.NIP = strings.TrimSpace(input.NIP)
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

	if uc.verifier == nil {
		return nil, ErrRegistrationEmailUnavailable
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

	result := &RegisterOutput{
		ID:        user.ID,
		Message:   "Registration submitted successfully",
		CreatedAt: user.CreatedAt,
	}
	if id, err := uc.verifier.QueueRegistrationVerification(ctx, user); err == nil && id != uuid.Nil {
		result.VerificationQueued = true
		result.VerificationDeliveryID = &id
	}
	return result, nil
}

func validateRegisterInput(input RegisterInput) error {
	if input.Name == "" {
		return errors.ErrInvalidName
	}
	if !domain.ValidEmailAddress(input.Email) {
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
	return nil
}
