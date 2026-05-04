package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainErrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type registerStubUserRepo struct {
	created   *entity.User
	byLookup  map[string]*entity.User
	byNIP     map[string]*entity.User
	createErr error
}

func (s *registerStubUserRepo) Create(_ context.Context, user *entity.User) error {
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

func (s *registerStubUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	return nil, nil
}

func (s *registerStubUserRepo) GetByUsername(_ context.Context, identifier string) (*entity.User, error) {
	if s.byLookup == nil {
		return nil, pgx.ErrNoRows
	}
	if user, ok := s.byLookup[identifier]; ok {
		return user, nil
	}
	return nil, pgx.ErrNoRows
}

func (s *registerStubUserRepo) GetByNIP(_ context.Context, nip string) (*entity.User, error) {
	if s.byNIP == nil {
		return nil, pgx.ErrNoRows
	}
	if user, ok := s.byNIP[nip]; ok {
		return user, nil
	}
	return nil, pgx.ErrNoRows
}

func (s *registerStubUserRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *registerStubUserRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *registerStubUserRepo) List(_ context.Context) ([]*entity.User, error)  { return nil, nil }
func (s *registerStubUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

type registerStubOrgRepo struct {
	orgs map[uuid.UUID]*entity.Organization
}

func (s *registerStubOrgRepo) Create(_ context.Context, _ *entity.Organization) error { return nil }
func (s *registerStubOrgRepo) Update(_ context.Context, _ *entity.Organization) error { return nil }
func (s *registerStubOrgRepo) Delete(_ context.Context, _ uuid.UUID) error            { return nil }
func (s *registerStubOrgRepo) List(_ context.Context) ([]*entity.Organization, error)  { return nil, nil }
func (s *registerStubOrgRepo) ListWithFilter(_ context.Context, _ repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (s *registerStubOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (s *registerStubOrgRepo) GetContext(_ context.Context, _ uuid.UUID) (string, error) {
	return "", nil
}
func (s *registerStubOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	if org, ok := s.orgs[id]; ok {
		return org, nil
	}
	return nil, domainErrors.ErrNotFound
}

func TestRegisterUseCaseCreatesPendingUnitUser(t *testing.T) {
	orgID := uuid.New()
	userRepo := &registerStubUserRepo{}
	orgRepo := &registerStubOrgRepo{
		orgs: map[uuid.UUID]*entity.Organization{
			orgID: {ID: orgID, Name: "Direktorat Surveilans"},
		},
	}

	uc := NewRegisterUseCase(userRepo, orgRepo)

	result, err := uc.Execute(context.Background(), RegisterInput{
		Name:            "Siti Rahma",
		Email:           "siti@kemenkes.go.id",
		Username:        "siti.rahma",
		Password:        "TempPass123!",
		ConfirmPassword: "TempPass123!",
		OrganizationID:  &orgID,
		NIP:             "199001012020122001",
		Jabatan:         "Analis",
		Pangkat:         "III/c",
		PhoneNumber:     "081234567890",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if userRepo.created == nil {
		t.Fatal("expected user to be created")
	}
	if userRepo.created.Role != entity.RoleUnit {
		t.Fatalf("expected forced unit role, got %q", userRepo.created.Role)
	}
	if userRepo.created.Status != entity.UserStatusPendingActivation {
		t.Fatalf("expected pending activation, got %q", userRepo.created.Status)
	}
	if userRepo.created.MustChangePassword {
		t.Fatal("expected mustChangePassword to be false")
	}
	if userRepo.created.PhoneNumber != "081234567890" {
		t.Fatalf("expected phone number to be persisted, got %q", userRepo.created.PhoneNumber)
	}
}

func TestRegisterUseCaseRejectsPasswordMismatch(t *testing.T) {
	orgID := uuid.New()
	uc := NewRegisterUseCase(&registerStubUserRepo{}, &registerStubOrgRepo{
		orgs: map[uuid.UUID]*entity.Organization{
			orgID: {ID: orgID, Name: "Direktorat Surveilans"},
		},
	})

	_, err := uc.Execute(context.Background(), RegisterInput{
		Name:            "Siti Rahma",
		Email:           "siti@kemenkes.go.id",
		Username:        "siti.rahma",
		Password:        "TempPass123!",
		ConfirmPassword: "Mismatch123!",
		OrganizationID:  &orgID,
		NIP:             "199001012020122001",
		PhoneNumber:     "081234567890",
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !domainErrors.IsValidation(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestRegisterUseCaseRejectsDuplicateUsernameEmailAndNIP(t *testing.T) {
	orgID := uuid.New()
	tests := []struct {
		name    string
		userMap map[string]*entity.User
		nipMap  map[string]*entity.User
	}{
		{
			name: "duplicate username",
			userMap: map[string]*entity.User{
				"siti.rahma": {ID: uuid.New(), Username: "siti.rahma"},
			},
		},
		{
			name: "duplicate email",
			userMap: map[string]*entity.User{
				"siti@kemenkes.go.id": {ID: uuid.New(), Email: "siti@kemenkes.go.id"},
			},
		},
		{
			name: "duplicate nip",
			nipMap: map[string]*entity.User{
				"199001012020122001": {ID: uuid.New(), NIP: "199001012020122001"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uc := NewRegisterUseCase(&registerStubUserRepo{byLookup: tt.userMap, byNIP: tt.nipMap}, &registerStubOrgRepo{
				orgs: map[uuid.UUID]*entity.Organization{
					orgID: {ID: orgID, Name: "Direktorat Surveilans"},
				},
			})

			_, err := uc.Execute(context.Background(), RegisterInput{
				Name:            "Siti Rahma",
				Email:           "siti@kemenkes.go.id",
				Username:        "siti.rahma",
				Password:        "TempPass123!",
				ConfirmPassword: "TempPass123!",
				OrganizationID:  &orgID,
				NIP:             "199001012020122001",
				PhoneNumber:     "081234567890",
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

func TestRegisterUseCaseRejectsMissingOrganization(t *testing.T) {
	orgID := uuid.New()
	uc := NewRegisterUseCase(&registerStubUserRepo{}, &registerStubOrgRepo{})

	_, err := uc.Execute(context.Background(), RegisterInput{
		Name:            "Siti Rahma",
		Email:           "siti@kemenkes.go.id",
		Username:        "siti.rahma",
		Password:        "TempPass123!",
		ConfirmPassword: "TempPass123!",
		OrganizationID:  &orgID,
		NIP:             "199001012020122001",
		PhoneNumber:     "081234567890",
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
