package user

import (
	"context"
	stderrors "errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"golang.org/x/crypto/bcrypt"
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
	Email          string
	Password       string
	Role           string
	OrganizationID *uuid.UUID
	NIP            string
	Jabatan        string
	Pangkat        string
	PhoneNumber    string
}

type CreateUserOutput struct {
	ID        uuid.UUID
	Message   string
	CreatedAt time.Time
}

func (uc *CreateUserUseCase) Execute(ctx context.Context, input CreateUserInput) (*CreateUserOutput, error) {
	normalizedRole := entity.NormalizeRole(input.Role)

	// 1. Validate input
	if input.Name == "" {
		return nil, errors.ErrInvalidName
	}
	if input.Email == "" {
		return nil, errors.ErrInvalidEmail
	}
	if input.NIP == "" {
		return nil, errors.Wrap(errors.ErrInvalidInput, "nip cannot be empty")
	}
	if normalizedRole == "" {
		return nil, errors.ErrInvalidRole
	}
	if !isSupportedUserRole(normalizedRole) {
		return nil, errors.ErrInvalidRole
	}
	if input.Password == "" {
		return nil, errors.ErrInvalidPassword
	}
	if roleRequiresOrganization(normalizedRole) && input.OrganizationID == nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "organization is required for non-superadmin users")
	}

	// 2. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, "failed to hash password")
	}

	// 3. Check if email already exists
	existingUser, err := uc.lookupExistingUser(ctx, input.Email, "email")
	if existingUser != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "email already exists")
	}

	existingUser, err = uc.lookupExistingUser(ctx, input.NIP, "nip")
	if existingUser != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "nip already exists")
	}

	// 4. Create user entity
	user := &entity.User{
		Name:               input.Name,
		Username:           input.NIP,
		Email:              input.Email,
		PasswordHash:       string(passwordHash),
		Role:               normalizedRole,
		OrganizationID:     input.OrganizationID,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: true,
		NIP:                input.NIP,
		Jabatan:            input.Jabatan,
		Pangkat:            input.Pangkat,
		PhoneNumber:        input.PhoneNumber,
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

func isSupportedUserRole(role string) bool {
	switch role {
	case entity.RoleSuperAdmin, entity.RoleUnit, entity.RoleReviewer, entity.RolePimpinan:
		return true
	default:
		return false
	}
}

func roleRequiresOrganization(role string) bool {
	return role != entity.RoleSuperAdmin
}

func (uc *CreateUserUseCase) lookupExistingUser(ctx context.Context, identifier, field string) (*entity.User, error) {
	var existingUser *entity.User
	var err error
	switch field {
	case "nip":
		existingUser, err = uc.userRepo.GetByNIP(ctx, identifier)
	default:
		existingUser, err = uc.userRepo.GetByUsername(ctx, identifier)
	}
	if err != nil {
		if stderrors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, errors.Wrap(err, "failed to check "+field+" availability")
	}
	return existingUser, nil
}
