package auth

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
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
func (s *stubUserRepo) GetByNIP(_ context.Context, _ string) (*entity.User, error) {
	return nil, nil
}
func (s *stubUserRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *stubUserRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *stubUserRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }
func (s *stubUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}
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
func (s *stubOrgRepo) ListWithFilter(_ context.Context, _ repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (s *stubOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return s.descendants, nil
}
func (s *stubOrgRepo) GetContext(_ context.Context, _ uuid.UUID) (string, error) {
	return "", nil
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
			Email:          "test-user@manris.local",
			Role:           "unit",
			OrganizationID: &orgID,
			OrgName:        "Unit A",
			Status:         "active",
			NIP:            "19880101",
			Jabatan:        "Koordinator",
			Pangkat:        "III/c",
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
	}

	orgRepo := &stubOrgRepo{descendants: []uuid.UUID{orgID, childOrg}}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)

	uc := NewGetCurrentUserUseCase(userRepo, hierarchySvc, true)

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
	if profile.MustChangePassword {
		t.Error("expected MustChangePassword = false when user does not require password change")
	}
	if profile.Email != "test-user@manris.local" {
		t.Fatalf("expected email to be included, got %q", profile.Email)
	}
	if profile.OrgName != "Unit A" {
		t.Fatalf("expected orgName to be included, got %q", profile.OrgName)
	}
	if profile.NIP != "19880101" {
		t.Fatalf("expected NIP to be included, got %q", profile.NIP)
	}
	if profile.Jabatan != "Koordinator" {
		t.Fatalf("expected jabatan to be included, got %q", profile.Jabatan)
	}
	if profile.Pangkat != "III/c" {
		t.Fatalf("expected pangkat to be included, got %q", profile.Pangkat)
	}

	serialized, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("marshal user profile: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(serialized, &payload); err != nil {
		t.Fatalf("unmarshal user profile json: %v", err)
	}
	capabilities, ok := payload["capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected capabilities payload, got %#v", payload["capabilities"])
	}
	riskApprovalWorkflowEnabled, ok := capabilities["riskApprovalWorkflowEnabled"].(bool)
	if !ok {
		t.Fatalf("expected boolean riskApprovalWorkflowEnabled, got %#v", capabilities["riskApprovalWorkflowEnabled"])
	}
	if !riskApprovalWorkflowEnabled {
		t.Fatal("expected riskApprovalWorkflowEnabled to be true")
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

	uc := NewGetCurrentUserUseCase(userRepo, hierarchySvc, true)

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

func TestGetCurrentUser_IncludesMustChangePassword(t *testing.T) {
	userID := uuid.New()

	userRepo := &stubUserRepo{
		user: &entity.User{
			ID:                 userID,
			Username:           "pending-user",
			Name:               "Pending User",
			Email:              "pending-user@manris.local",
			Role:               entity.RoleSuperAdmin,
			Status:             entity.UserStatusPendingActivation,
			MustChangePassword: true,
			NIP:                "19880101",
			Jabatan:            "Koordinator",
			Pangkat:            "III/c",
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		},
	}

	orgRepo := &stubOrgRepo{}
	hierarchySvc := service.NewOrganizationHierarchy(orgRepo)
	uc := NewGetCurrentUserUseCase(userRepo, hierarchySvc, false)

	profile, err := uc.Execute(context.Background(), GetCurrentUserInput{UserID: userID})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !profile.MustChangePassword {
		t.Fatal("expected MustChangePassword to be preserved in user profile")
	}
	if profile.Email != "pending-user@manris.local" {
		t.Fatalf("expected email to be included, got %q", profile.Email)
	}
	if profile.NIP != "19880101" {
		t.Fatalf("expected NIP to be included, got %q", profile.NIP)
	}
	if profile.Jabatan != "Koordinator" {
		t.Fatalf("expected jabatan to be included, got %q", profile.Jabatan)
	}
	if profile.Pangkat != "III/c" {
		t.Fatalf("expected pangkat to be included, got %q", profile.Pangkat)
	}

	serialized, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("marshal user profile: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(serialized, &payload); err != nil {
		t.Fatalf("unmarshal user profile json: %v", err)
	}
	capabilities, ok := payload["capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected capabilities payload, got %#v", payload["capabilities"])
	}
	riskApprovalWorkflowEnabled, ok := capabilities["riskApprovalWorkflowEnabled"].(bool)
	if !ok {
		t.Fatalf("expected boolean riskApprovalWorkflowEnabled, got %#v", capabilities["riskApprovalWorkflowEnabled"])
	}
	if riskApprovalWorkflowEnabled {
		t.Fatal("expected riskApprovalWorkflowEnabled to be false")
	}
}
