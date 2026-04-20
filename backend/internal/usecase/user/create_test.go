package user

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainErrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"golang.org/x/crypto/bcrypt"
)

type createUserStubRepo struct {
	created     *entity.User
	byLookup    map[string]*entity.User
	errByLookup map[string]error
	createErr   error
	getErr      error
}

func (s *createUserStubRepo) Create(_ context.Context, user *entity.User) error {
	s.created = user
	if s.createErr != nil {
		return s.createErr
	}
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = user.CreatedAt
	}
	return nil
}

func (s *createUserStubRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	return nil, nil
}

func (s *createUserStubRepo) GetByUsername(_ context.Context, username string) (*entity.User, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	if s.errByLookup != nil {
		if err, ok := s.errByLookup[username]; ok {
			return nil, err
		}
	}
	if s.byLookup == nil {
		return nil, nil
	}
	return s.byLookup[username], nil
}

func (s *createUserStubRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *createUserStubRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *createUserStubRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }
func (s *createUserStubRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

type createUserStubOrgRepo struct {
	orgs map[uuid.UUID]*entity.Organization
}

func (s *createUserStubOrgRepo) Create(_ context.Context, _ *entity.Organization) error { return nil }
func (s *createUserStubOrgRepo) Update(_ context.Context, _ *entity.Organization) error { return nil }
func (s *createUserStubOrgRepo) Delete(_ context.Context, _ uuid.UUID) error            { return nil }
func (s *createUserStubOrgRepo) List(_ context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (s *createUserStubOrgRepo) ListWithFilter(_ context.Context, _ repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (s *createUserStubOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (s *createUserStubOrgRepo) GetContext(_ context.Context, _ uuid.UUID) (string, error) {
	return "", nil
}

func (s *createUserStubOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	if org, ok := s.orgs[id]; ok {
		return org, nil
	}
	return nil, domainErrors.ErrNotFound
}

func TestCreateUserExecuteHashesPasswordAndSetsOnboardingDefaults(t *testing.T) {
	orgID := uuid.New()
	userRepo := &createUserStubRepo{}
	orgRepo := &createUserStubOrgRepo{
		orgs: map[uuid.UUID]*entity.Organization{
			orgID: {ID: orgID, Name: "Direktorat Surveilans"},
		},
	}

	uc := NewCreateUserUseCase(userRepo, orgRepo)

	result, err := uc.Execute(context.Background(), CreateUserInput{
		Name:           "Unit Test User",
		Username:       "unit-test-user",
		Email:          "unit-test-user@manris.local",
		Password:       "TempPass123!",
		Role:           entity.RoleUnit,
		OrganizationID: &orgID,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if userRepo.created == nil {
		t.Fatal("expected user to be persisted")
	}
	if userRepo.created.PasswordHash == "TempPass123!" {
		t.Fatal("expected stored password to be hashed")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(userRepo.created.PasswordHash), []byte("TempPass123!")); err != nil {
		t.Fatalf("expected bcrypt hash to match password: %v", err)
	}
	if userRepo.created.Status != entity.UserStatusPendingActivation {
		t.Fatalf("expected status %q, got %q", entity.UserStatusPendingActivation, userRepo.created.Status)
	}
	if !userRepo.created.MustChangePassword {
		t.Fatal("expected must_change_password default to true")
	}
}

func TestCreateUserExecuteRejectsUnsupportedRole(t *testing.T) {
	uc := NewCreateUserUseCase(&createUserStubRepo{}, &createUserStubOrgRepo{})

	_, err := uc.Execute(context.Background(), CreateUserInput{
		Name:     "Viewer User",
		Username: "viewer-user",
		Email:    "viewer@manris.local",
		Password: "TempPass123!",
		Role:     "viewer",
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !domainErrors.IsValidation(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
	if err.Error() != domainErrors.ErrInvalidRole.Error() {
		t.Fatalf("expected invalid role error, got %v", err)
	}
}

func TestCreateUserExecuteRejectsDuplicateUsernameOrEmail(t *testing.T) {
	tests := []struct {
		name   string
		lookup map[string]*entity.User
	}{
		{
			name: "duplicate username",
			lookup: map[string]*entity.User{
				"unit-test-user": {ID: uuid.New(), Username: "unit-test-user"},
			},
		},
		{
			name: "duplicate email",
			lookup: map[string]*entity.User{
				"unit-test-user@manris.local": {ID: uuid.New(), Email: "unit-test-user@manris.local"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uc := NewCreateUserUseCase(&createUserStubRepo{byLookup: tt.lookup}, &createUserStubOrgRepo{})

			_, err := uc.Execute(context.Background(), CreateUserInput{
				Name:     "Unit Test User",
				Username: "unit-test-user",
				Email:    "unit-test-user@manris.local",
				Password: "TempPass123!",
				Role:     entity.RoleSuperAdmin,
			})
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !domainErrors.IsValidation(err) {
				t.Fatalf("expected validation error, got %v", err)
			}
		})
	}
}

func TestCreateUserExecuteAllowsNotFoundLookupsWrappedFromRepository(t *testing.T) {
	uc := NewCreateUserUseCase(&createUserStubRepo{
		errByLookup: map[string]error{
			"missing-user":              pgx.ErrNoRows,
			"missing-user@manris.local": pgx.ErrNoRows,
		},
	}, &createUserStubOrgRepo{})

	result, err := uc.Execute(context.Background(), CreateUserInput{
		Name:     "Missing User",
		Username: "missing-user",
		Email:    "missing-user@manris.local",
		Password: "TempPass123!",
		Role:     entity.RoleSuperAdmin,
	})
	if err != nil {
		t.Fatalf("expected wrapped not-found lookups to be ignored, got %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
}

func TestCreateUserExecuteRequiresOrganizationForScopedRoles(t *testing.T) {
	tests := []struct {
		name string
		role string
	}{
		{name: "unit requires organization", role: entity.RoleUnit},
		{name: "reviewer requires organization", role: entity.RoleReviewer},
		{name: "pimpinan requires organization", role: entity.RolePimpinan},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uc := NewCreateUserUseCase(&createUserStubRepo{}, &createUserStubOrgRepo{})

			_, err := uc.Execute(context.Background(), CreateUserInput{
				Name:     "Scoped User",
				Username: "scoped-user",
				Email:    "scoped-user@manris.local",
				Password: "TempPass123!",
				Role:     tt.role,
			})
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !domainErrors.IsValidation(err) {
				t.Fatalf("expected validation error, got %v", err)
			}
		})
	}
}
