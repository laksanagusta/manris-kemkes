package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
)

type stubUserRepo struct {
	user *entity.User
	err  error
}

func (s *stubUserRepo) Create(_ context.Context, _ *entity.User) error { return nil }
func (s *stubUserRepo) GetByUsername(_ context.Context, _ string) (*entity.User, error) {
	return nil, nil
}
func (s *stubUserRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *stubUserRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *stubUserRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }
func (s *stubUserRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.user, nil
}

type stubOrgRepo struct {
	descendants []uuid.UUID
}

func (s *stubOrgRepo) Create(_ context.Context, _ *entity.Organization) error { return nil }
func (s *stubOrgRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.Organization, error) {
	return nil, nil
}
func (s *stubOrgRepo) Update(_ context.Context, _ *entity.Organization) error { return nil }
func (s *stubOrgRepo) Delete(_ context.Context, _ uuid.UUID) error            { return nil }
func (s *stubOrgRepo) List(_ context.Context) ([]*entity.Organization, error) { return nil, nil }
func (s *stubOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return s.descendants, nil
}

func TestGetCurrentUser_IncludesAccessibleOrgIDs(t *testing.T) {
	orgID := uuid.New()
	childOrg := uuid.New()
	userID := uuid.New()

	userRepo := &stubUserRepo{
		user: &entity.User{
			ID:             userID,
			Username:       "testuser",
			Name:           "Test User",
			Role:           "unit",
			OrganizationID: &orgID,
			Status:         "active",
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
	}

	orgRepo := &stubOrgRepo{descendants: []uuid.UUID{orgID, childOrg}}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)

	uc := NewGetCurrentUserUseCase(userRepo, hierarchySvc)

	profile, err := uc.Execute(context.Background(), GetCurrentUserInput{UserID: userID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(profile.AccessibleOrgIDs) != 2 {
		t.Fatalf("expected 2 accessible org IDs, got %d", len(profile.AccessibleOrgIDs))
	}
	if profile.IsGlobal {
		t.Error("expected IsGlobal = false for unit role")
	}
}

func TestGetCurrentUser_SuperadminIsGlobal(t *testing.T) {
	userID := uuid.New()

	userRepo := &stubUserRepo{
		user: &entity.User{
			ID:        userID,
			Username:  "admin",
			Name:      "Admin",
			Role:      "superadmin",
			Status:    "active",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	orgRepo := &stubOrgRepo{}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)

	uc := NewGetCurrentUserUseCase(userRepo, hierarchySvc)

	profile, err := uc.Execute(context.Background(), GetCurrentUserInput{UserID: userID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !profile.IsGlobal {
		t.Error("expected IsGlobal = true for superadmin")
	}
	if profile.AccessibleOrgIDs != nil {
		t.Error("expected nil AccessibleOrgIDs for global scope")
	}
}
