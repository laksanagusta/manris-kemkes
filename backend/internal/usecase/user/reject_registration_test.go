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

type rejectRegistrationStubUserRepo struct {
	user       *entity.User
	deletedID  uuid.UUID
}

func (s *rejectRegistrationStubUserRepo) Create(_ context.Context, _ *entity.User) error { return nil }
func (s *rejectRegistrationStubUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	if s.user == nil {
		return nil, domainErrors.ErrNotFound
	}
	copy := *s.user
	return &copy, nil
}
func (s *rejectRegistrationStubUserRepo) GetByUsername(_ context.Context, _ string) (*entity.User, error) {
	return nil, nil
}
func (s *rejectRegistrationStubUserRepo) GetByNIP(_ context.Context, _ string) (*entity.User, error) {
	return nil, nil
}
func (s *rejectRegistrationStubUserRepo) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *rejectRegistrationStubUserRepo) Delete(_ context.Context, id uuid.UUID) error {
	s.deletedID = id
	return nil
}
func (s *rejectRegistrationStubUserRepo) List(_ context.Context) ([]*entity.User, error) {
	return nil, nil
}
func (s *rejectRegistrationStubUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

func TestRejectRegistrationExecuteDeletesPendingUser(t *testing.T) {
	userID := uuid.New()
	repo := &rejectRegistrationStubUserRepo{
		user: &entity.User{
			ID:        userID,
			Status:    entity.UserStatusPendingActivation,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	uc := NewRejectRegistrationUseCase(repo)
	result, err := uc.Execute(context.Background(), userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if repo.deletedID != userID {
		t.Fatalf("expected delete for %s, got %s", userID, repo.deletedID)
	}
}

func TestRejectRegistrationExecuteRejectsNonPendingUser(t *testing.T) {
	userID := uuid.New()
	repo := &rejectRegistrationStubUserRepo{
		user: &entity.User{
			ID:     userID,
			Status: entity.UserStatusActive,
		},
	}

	uc := NewRejectRegistrationUseCase(repo)
	if _, err := uc.Execute(context.Background(), userID); err == nil || err != domainErrors.ErrNotPending {
		t.Fatalf("expected ErrNotPending, got %v", err)
	}
}
