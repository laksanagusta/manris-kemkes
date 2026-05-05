package user

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainErrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type approveRegistrationStubUserRepo struct {
	user        *entity.User
	updatedUser *entity.User
}

func (s *approveRegistrationStubUserRepo) Create(_ context.Context, _ *entity.User) error { return nil }
func (s *approveRegistrationStubUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	if s.user == nil {
		return nil, domainErrors.ErrNotFound
	}
	copy := *s.user
	return &copy, nil
}
func (s *approveRegistrationStubUserRepo) GetByUsername(_ context.Context, _ string) (*entity.User, error) {
	return nil, nil
}
func (s *approveRegistrationStubUserRepo) GetByNIP(_ context.Context, _ string) (*entity.User, error) {
	return nil, nil
}
func (s *approveRegistrationStubUserRepo) Update(_ context.Context, user *entity.User) error {
	copy := *user
	s.updatedUser = &copy
	s.user = &copy
	return nil
}
func (s *approveRegistrationStubUserRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }
func (s *approveRegistrationStubUserRepo) List(_ context.Context) ([]*entity.User, error) {
	return nil, nil
}
func (s *approveRegistrationStubUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

func TestApproveRegistrationExecuteActivatesPendingUser(t *testing.T) {
	userID := uuid.New()
	repo := &approveRegistrationStubUserRepo{
		user: &entity.User{
			ID:                 userID,
			Status:             entity.UserStatusPendingActivation,
			MustChangePassword: false,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		},
	}

	uc := NewApproveRegistrationUseCase(repo)
	result, err := uc.Execute(context.Background(), userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if repo.updatedUser == nil {
		t.Fatal("expected repository update to run")
	}
	if repo.updatedUser.Status != entity.UserStatusActive {
		t.Fatalf("expected active status, got %q", repo.updatedUser.Status)
	}
	if repo.updatedUser.MustChangePassword {
		t.Fatal("expected mustChangePassword to stay false")
	}
}

func TestApproveRegistrationExecuteRejectsNonPendingUser(t *testing.T) {
	userID := uuid.New()
	repo := &approveRegistrationStubUserRepo{
		user: &entity.User{
			ID:     userID,
			Status: entity.UserStatusActive,
		},
	}

	uc := NewApproveRegistrationUseCase(repo)
	if _, err := uc.Execute(context.Background(), userID); err == nil || err != domainErrors.ErrNotPending {
		t.Fatalf("expected ErrNotPending, got %v", err)
	}
}
