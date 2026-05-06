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

type updateProfileStubUserRepo struct {
	user        *entity.User
	updatedUser *entity.User
}

func (s *updateProfileStubUserRepo) Create(context.Context, *entity.User) error { return nil }
func (s *updateProfileStubUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	copy := *s.user
	return &copy, nil
}
func (s *updateProfileStubUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (s *updateProfileStubUserRepo) GetByNIP(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (s *updateProfileStubUserRepo) Update(_ context.Context, user *entity.User) error {
	copy := *user
	s.updatedUser = &copy
	s.user = &copy
	return nil
}
func (s *updateProfileStubUserRepo) Delete(context.Context, uuid.UUID) error      { return nil }
func (s *updateProfileStubUserRepo) List(context.Context) ([]*entity.User, error) { return nil, nil }
func (s *updateProfileStubUserRepo) ListWithFilter(context.Context, repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

func TestUpdateProfileUseCase_UpdatesEditableFieldsOnly(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	repo := &updateProfileStubUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "unit-user",
		Email:              "old@manris.local",
		Name:               "Old Name",
		Role:               entity.RoleUnit,
		OrganizationID:     &orgID,
		OrgName:            "Direktorat A",
		Status:             entity.UserStatusActive,
		MustChangePassword: false,
		NIP:                "123",
		Jabatan:            "Analis",
		Pangkat:            "III/a",
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	uc := NewUpdateProfileUseCase(repo, service.NewOrganizationHierarchy(&stubOrgRepo{descendants: []uuid.UUID{orgID}}), false)
	profile, err := uc.Execute(context.Background(), UpdateProfileInput{
		UserID:  userID,
		Name:    "New Name",
		Email:   "new@manris.local",
		NIP:     "456",
		Jabatan: "Koordinator",
		Pangkat: "III/b",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.updatedUser == nil {
		t.Fatal("expected repository user state to be updated")
	}
	if repo.updatedUser.Role != entity.RoleUnit {
		t.Fatalf("expected role to stay unit, got %q", repo.updatedUser.Role)
	}
	if repo.updatedUser.Status != entity.UserStatusActive {
		t.Fatalf("expected status to stay active, got %q", repo.updatedUser.Status)
	}
	if repo.updatedUser.OrganizationID == nil || *repo.updatedUser.OrganizationID != orgID {
		t.Fatalf("expected organization to stay unchanged, got %#v", repo.updatedUser.OrganizationID)
	}
	if profile == nil || profile.Email != "new@manris.local" {
		t.Fatalf("expected updated profile email, got %#v", profile)
	}
	if profile.OrgName != "Direktorat A" {
		t.Fatalf("expected orgName to stay available, got %q", profile.OrgName)
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
